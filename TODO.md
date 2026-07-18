# TODO

- [x] Investigate why timer +/- buttons do not work (front emits `extend_room_timer`; backend socket checks admin via `room.members`)
- [x] Update backend socket handler `extend_room_timer` to: (1) log admin check inputs and results, (2) fix admin authorization (creator OR member admin), (3) ensure timer update broadcast works

- [ ] Update frontend if needed to ensure it uses correct payload (`user` object) for socket event
- [ ] Test: click + and − as admin; confirm timer changes for all clients


