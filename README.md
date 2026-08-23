# Doctor Rush • Trường GPP — v1.0.23

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
`version.json` + `sw.js` kiểm tra bản mới, không ép reload giữa ván. Cache hiện tại: `doctor-rush-v23`.

## Debug ẩn
Mở URL với `?debug=1` để xem FPS, chất lượng, DPR, cấp độ, tốc độ, hitbox và số lượng đối tượng.


## Thay đổi v1.0.21
- Giảm mạnh tốc độ/mật độ vật cản cả 3 cấp để ưu tiên cảm giác thư giãn.
- Dễ: vật cản bay cực hiếm, combo gần như không có.
- Vật phẩm có hành lang an toàn: game trì hoãn vật cản nếu phần thưởng đang ở vùng sinh, và trì hoãn vật phẩm nếu phía trước đang nguy hiểm.
- Giảm tốc vật cản bay ngược và làm chuyển động lên/xuống mượt hơn.


## v1.0.21 – HUD ổn định
- HUD Điểm/Vật phẩm/Kỷ lục dùng số tabular + kích thước cố định, không co giãn theo số.
- Chỉ cập nhật DOM khi giá trị thực sự thay đổi.
- Bỏ backdrop blur khỏi HUD/Health để tránh cảm giác rung khi nền game rung.
- PC: thông tin liên hệ chuyển sang góc phải dưới, tách khỏi thanh Sinh tồn.
- Mobile: hiển thị dải liên hệ trong lúc chơi và giữ thông tin liên hệ rõ ở menu.


## v1.0.21 – Continuous Items
- Vật phẩm thường xuất hiện trực tiếp trong khung hình, không còn phải chờ chạy từ ngoài màn hình vào.
- Mỗi cụm ngẫu nhiên 2–6 vật phẩm.
- Nếu số vật phẩm nhìn thấy giảm dưới 2, hệ thống tự bổ sung cụm mới.
- Vẫn giữ hành lang an toàn và trì hoãn vật cản để vật phẩm không trở thành mồi bẫy.


## v1.0.21 Smooth Pace
- Tốc độ chạy tăng mượt liên tục theo thời gian, không giảm và không nhảy bậc.
- Dễ/Trung bình/Khó bắt đầu lần lượt 3.40 / 3.90 / 4.40, tiến dần về 6.80 / 8.20 / 9.80.
- Màn Dễ có vật cản đầu tiên trong vài giây đầu, luôn trong 10 giây đầu.
- Tỷ lệ vật cản bay, combo và khoảng cách vật cản nội suy liên tục thay vì đổi đột ngột ở mốc 250/500/1000.
- Chai thuốc xanh: Nam châm hút vật phẩm 8 giây, không làm chậm game.


## v1.0.21 Mobile Menu
- Thêm nút **← Về menu chính** chỉ hiện khi đang chơi trên điện thoại ngang.
- Khi bấm, game tạm dừng ngay và hỏi xác nhận.
- **Tiếp tục chơi** khôi phục đúng trạng thái trước đó; **Về menu chính** dừng ván và quay lại màn chọn cấp độ.
- Nút Back Android trong lúc chơi dùng cùng cơ chế xác nhận để tránh thoát nhầm.


## v1.0.21
- Nút ← Về menu chính hoạt động trên cả PC và mobile; Esc trên PC mở hộp xác nhận để về màn chọn cấp độ.
- Logo GPP là vật phẩm đặc biệt tổng hợp: +4 sinh tồn, +100 điểm, khiên 10 giây, nam châm 8 giây.
- Tần suất GPP được tăng lên: vẫn ít hơn bonus item nhưng không còn quá hiếm.


## v1.0.22
- Thêm logo GPP kích thước lớn ở trung tâm hậu cảnh, nằm sau chữ BỆNH VIỆN.
- Logo nền cố định, mờ/sương nhẹ và dùng blend multiply để nền trắng không tạo mảng trắng.


## v1.0.23 – Logo nền tinh gọn
- Thu nhỏ logo GPP nền còn khoảng 25% chiều ngang.
- Căn giữa đúng cụm chữ BỆNH VIỆN.
- Giảm opacity và blur để logo chìm nhẹ sau chữ, không rối nền.
