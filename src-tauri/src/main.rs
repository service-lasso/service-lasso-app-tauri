#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{
    io::{BufRead, BufReader, Write},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::Manager;

struct Host {
    child: Arc<Mutex<Child>>,
    closing: Arc<AtomicBool>,
    exited: Arc<AtomicBool>,
}
fn port() -> std::io::Result<u16> {
    Ok(std::net::TcpListener::bind("127.0.0.1:0")?
        .local_addr()?
        .port())
}

// Node's Windows entrypoint resolver cannot consume Tauri's extended path prefix.
fn node_path(path: std::path::PathBuf) -> std::path::PathBuf {
    #[cfg(windows)]
    {
        let text = path.as_os_str().to_string_lossy();
        if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
            return std::path::PathBuf::from(format!(r"\\{rest}"));
        }
        if let Some(rest) = text.strip_prefix(r"\\?\") {
            return std::path::PathBuf::from(rest);
        }
    }
    path
}

fn main() {
    tauri::Builder::default().setup(|app| {
        let payload = node_path(app.path().resource_dir()?.join("host"));
        let workspace = node_path(std::env::var_os("SERVICE_LASSO_APP_TAURI_WORKSPACE_BASE_ROOT").map(std::path::PathBuf::from).unwrap_or(app.path().app_local_data_dir()?));
        std::fs::create_dir_all(&workspace)?;
        let host_port = port()?;
        let mut api_port = port()?;
        while api_port == host_port { api_port = port()?; }
        let host_url = format!("http://127.0.0.1:{host_port}");
        let log = std::fs::OpenOptions::new().create(true).append(true).open(workspace.join("host.log"))?;
        let mut command = Command::new(payload.join("node.exe"));
        command.arg(payload.join("src/index.js")).current_dir(&payload)
            .env("SERVICE_LASSO_NATIVE_CHILD", "1")
            .env("SERVICE_LASSO_APP_TAURI_WORKSPACE_BASE_ROOT", &workspace)
            .env("SERVICE_LASSO_WORKSPACE_ROOT", workspace.join("runtime"))
            .env("SERVICE_LASSO_SERVICES_ROOT", workspace.join("services"))
            .env("SERVICE_LASSO_APP_TAURI_SOURCE_SERVICES_ROOT", payload.join("services"))
            .env("SERVICE_LASSO_APP_TAURI_ADMIN_DIST_ROOT", payload.join(".payload/admin"))
            .env("SERVICE_LASSO_APP_TAURI_PORT", host_port.to_string())
            .env("SERVICE_LASSO_API_PORT", api_port.to_string())
            .env("SERVICE_LASSO_HOST", "127.0.0.1")
            .env("SERVICE_LASSO_INSTANCE_REGISTRY_PATH", workspace.join("instance-registry.json"))
            .env("SERVICE_LASSO_HOST_PORT_REGISTRY_PATH", workspace.join("host-port-registry.json"))
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::from(log.try_clone()?));
        #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
        let mut child = command.spawn()?;
        let pid = child.id();
        let stdout = child.stdout.take().ok_or("Missing child output")?;
        let (sender, receiver) = mpsc::channel();
        let expected_url = host_url.clone();
        std::thread::spawn(move || {
            let mut log = log;
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let _ = writeln!(log, "{line}");
                if let Some(record) = line.strip_prefix("SL_NATIVE_READY:") {
                    if let Ok(value) = serde_json::from_str::<serde_json::Value>(record) {
                        if value["pid"].as_u64() == Some(pid as u64) && value["hostUrl"].as_str() == Some(expected_url.as_str()) { let _ = sender.send(()); }
                    }
                }
            }
        });
        if receiver.recv_timeout(Duration::from_secs(120)).is_err() {
            if let Some(input) = &mut child.stdin { let _ = input.write_all(b"shutdown\n"); }
            let deadline = Instant::now()+Duration::from_secs(10);
            while matches!(child.try_wait(),Ok(None)) && Instant::now()<deadline { std::thread::sleep(Duration::from_millis(200)); }
            if matches!(child.try_wait(),Ok(None)) { let _ = child.kill(); let _ = child.wait(); }
            return Err("Packaged host failed to start. Inspect retained host.log in the application workspace.".into());
        }
        app.manage(Host { child:Arc::new(Mutex::new(child)), closing:Arc::new(AtomicBool::new(false)), exited:Arc::new(AtomicBool::new(false)) });
        let window = app.get_webview_window("main").ok_or("Missing native window")?;
        if let Err(error) = window.navigate(host_url.parse()?) {
            let host = app.state::<Host>();
            let mut child = host.child.lock().unwrap();
            if let Some(input) = &mut child.stdin { let _ = input.write_all(b"shutdown\n"); }
            let deadline = Instant::now()+Duration::from_secs(10);
            while matches!(child.try_wait(),Ok(None)) && Instant::now()<deadline { std::thread::sleep(Duration::from_millis(200)); }
            if matches!(child.try_wait(),Ok(None)) { let _ = child.kill(); let _ = child.wait(); }
            return Err(error.into());
        }
        if std::env::args().any(|arg|arg=="--smoke-test") { let window = window.clone(); std::thread::spawn(move || { std::thread::sleep(Duration::from_secs(20)); let _ = window.close(); }); }
        Ok(())
    }).on_window_event(|window,event| {
        if let tauri::WindowEvent::CloseRequested {api,..} = event {
            let host = window.state::<Host>();
            if host.exited.load(Ordering::SeqCst) { return; }
            api.prevent_close();
            if host.closing.swap(true,Ordering::SeqCst) { return; }
            let child = host.child.clone(); let closing = host.closing.clone(); let exited = host.exited.clone(); let app = window.app_handle().clone();
            let _ = window.set_title("Closing services…");
            std::thread::spawn(move || {
                let deadline = Instant::now()+Duration::from_secs(60);
                let mut child = child.lock().unwrap();
                if let Some(input) = &mut child.stdin { let _ = input.write_all(b"shutdown\n"); }
                loop {
                    match child.try_wait() {
                        Ok(Some(status)) if status.success() => { exited.store(true,Ordering::SeqCst); app.exit(0); return; },
                        Ok(Some(_)) => { exited.store(true,Ordering::SeqCst); app.exit(1); return; },
                        Err(_) => break,
                        _ if Instant::now() >= deadline => break,
                        _ => std::thread::sleep(Duration::from_millis(200))
                    }
                }
                closing.store(false,Ordering::SeqCst);
                if let Some(window) = app.get_webview_window("main") { let _ = window.set_title("Close failed — inspect retained host.log and stop services"); }
            });
        }
    }).build(tauri::generate_context!()).expect("Could not start desktop host")
      .run(|app,event| { if let tauri::RunEvent::ExitRequested {api,..} = event { if let Some(host) = app.try_state::<Host>() { if !host.exited.load(Ordering::SeqCst) { api.prevent_exit(); } } } });
}
