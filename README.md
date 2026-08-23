# Doctor Rush • Trường GPP — v1.0.18

Bản phát hành PWA tĩnh dành cho GitHub Pages.

## Cài lên GitHub Pages
- Đưa toàn bộ file trong ZIP vào thư mục gốc repository.
- Settings → Pages → Deploy from a branch → `main` → `/(root)`.
- Không cần GitHub Actions.

## Mobile
- Chơi landscape; khi cầm dọc game yêu cầu xoay ngang.
- Android: dùng nút `Cài ứng dụng`.
- iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính.
- Khi mở từ icon đã cài, PWA chạy standalone/fullscreen và không có thanh địa chỉ trình duyệt.

## Tự cập nhật
`version.json` + `sw.js` kiểm tra bản mới, không ép reload giữa ván. Cache hiện tại: `doctor-rush-v15`.

## Debug ẩn
Mở URL với `?debug=1` để xem FPS, chất lượng, DPR, cấp độ, tốc độ, hitbox và số lượng đối tượng.


## Thay đổi v1.0.18
- Giảm mạnh tốc độ/mật độ vật cản cả 3 cấp để ưu tiên cảm giác thư giãn.
- Dễ: vật cản bay cực hiếm, combo gần như không có.
- Vật phẩm có hành lang an toàn: game trì hoãn vật cản nếu phần thưởng đang ở vùng sinh, và trì hoãn vật phẩm nếu phía trước đang nguy hiểm.
- Giảm tốc vật cản bay ngược và làm chuyển động lên/xuống mượt hơn.


## v1.0.18 – HUD ổn định
- HUD Điểm/Vật phẩm/Kỷ lục dùng số tabular + kích thước cố định, không co giãn theo số.
- Chỉ cập nhật DOM khi giá trị thực sự thay đổi.
- Bỏ backdrop blur khỏi HUD/Health để tránh cảm giác rung khi nền game rung.
- PC: thông tin liên hệ chuyển sang góc phải dưới, tách khỏi thanh Sinh tồn.
- Mobile: hiển thị dải liên hệ trong lúc chơi và giữ thông tin liên hệ rõ ở menu.


## v1.0.18 – Continuous Items
- Vật phẩm thường xuất hiện trực tiếp trong khung hình, không còn phải chờ chạy từ ngoài màn hình vào.
- Mỗi cụm ngẫu nhiên 2–6 vật phẩm.
- Nếu số vật phẩm nhìn thấy giảm dưới 2, hệ thống tự bổ sung cụm mới.
- Vẫn giữ hành lang an toàn và trì hoãn vật cản để vật phẩm không trở thành mồi bẫy.
