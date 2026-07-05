//! Health-poll loop integration tests.
//!
//! Spin up a synthetic TCP server on a random port that either replies with
//! `200 OK` or just accepts-and-closes. Verify `wait_for_healthy` reaches
//! the success path or times out as expected.

use metalu_lib::health::wait_for_healthy;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[tokio::test]
async fn wait_for_healthy_succeeds_when_200() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();

    let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>();
    let handle = thread::spawn(move || {
        listener.set_nonblocking(true).unwrap();
        loop {
            match listener.accept() {
                Ok((mut s, _)) => {
                    let mut buf = [0u8; 1024];
                    let _ = s.read(&mut buf);
                    let _ = s.write_all(b"HTTP/1.0 200 OK\r\nContent-Length: 0\r\n\r\n");
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    if shutdown_rx.try_recv().is_ok() {
                        break;
                    }
                    thread::sleep(Duration::from_millis(10));
                }
                Err(_) => break,
            }
        }
    });

    let result = wait_for_healthy(port, Duration::from_secs(2)).await;
    assert!(result.is_ok(), "expected healthy, got {:?}", result);

    let _ = shutdown_tx.send(());
    handle.join().unwrap();
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
