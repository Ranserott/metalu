//! Integration tests for the UDP discovery protocol.
//!
//! `parse_request` and `build_response` are pure functions and can be tested
//! without sockets. `full_round_trip` does a real loopback UDP exchange
//! between two `UdpSocket`s.

use metalu_lib::discovery::{
    bind_discovery_socket, build_response, handle_one_request, parse_request, DISCOVERY_MAGIC,
    DISCOVERY_PORT,
};
use std::net::UdpSocket;
use std::time::Duration;

#[test]
fn parse_request_accepts_magic() {
    assert!(parse_request(DISCOVERY_MAGIC));
    // Tolerates trailing garbage.
    assert!(parse_request(b"METALU_DISCOVER\nsome-padding"));
}

#[test]
fn parse_request_rejects_other() {
    assert!(!parse_request(b"hello"));
    // Missing trailing newline -> reject.
    assert!(!parse_request(b"METALU_DISCOVER"));
}

#[test]
fn build_response_contains_server_port() {
    let resp = build_response(3000).unwrap();
    let s = String::from_utf8(resp).unwrap();
    assert!(s.contains("\"port\":3000"), "got: {}", s);
}

#[test]
fn full_round_trip() {
    let server = bind_discovery_socket().expect("bind discovery");
    let server_port: u16 = 3000;

    let client = UdpSocket::bind("127.0.0.1:0").expect("bind client");
    client
        .set_read_timeout(Some(Duration::from_secs(2)))
        .unwrap();

    let server_addr = format!("127.0.0.1:{}", DISCOVERY_PORT);
    client.send_to(DISCOVERY_MAGIC, server_addr).unwrap();

    let peer = handle_one_request(&server, server_port).expect("handle");
    assert!(peer.is_some(), "server should have parsed request");

    let mut buf = [0u8; 1024];
    let (n, _) = client.recv_from(&mut buf).expect("client recv");
    let body = std::str::from_utf8(&buf[..n]).unwrap();
    assert!(body.contains("\"port\":3000"), "got: {}", body);
}
