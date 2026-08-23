# Doctor Rush • Trường GPP — v1.0.15

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
