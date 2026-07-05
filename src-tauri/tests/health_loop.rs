//! Health-poll loop integration tests.
//!
//! Spin up a synthetic TCP server on a random port that either replies with
//! `200 OK` or just accepts-and-closes. Verify `wait_for_healthy` reaches
//! the success path or times out as expected.

use metalu_lib::health::wait_for_healthy;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;
use std::time::Duration;

#[tokio::test]
async fn wait_for_healthy_succeeds_when_200() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();

    let server_handle = thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let _ = stream.set_read_timeout(Some(Duration::from_millis(200)));
            let mut s = stream;
            let mut buf = [0u8; 1024];
            let _ = s.read(&mut buf);
            let _ = s.write_all(b"HTTP/1.0 200 OK\r\nContent-Length: 0\r\n\r\n");
            let _ = s.flush();
        }
    });

    let result = wait_for_healthy(port, Duration::from_secs(2)).await;
    assert!(result.is_ok(), "expected healthy, got {:?}", result);

    // Detach the accept loop. We don't expect it to terminate cleanly.
    drop(server_handle);
}

#[tokio::test]
async fn wait_for_healthy_times_out_when_dead() {
    // Bind a port that nothing is listening on.
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);

    let result = wait_for_healthy(port, Duration::from_millis(800)).await;
    assert!(result.is_err(), "expected timeout, got {:?}", result);
}
