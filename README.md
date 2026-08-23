# Doctor Rush • Trường GPP

Bộ PWA hoàn chỉnh để đưa trực tiếp lên GitHub Pages. Không cần GitHub Actions nếu dùng website tĩnh này.

## Cấu trúc
- `index.html`: game Doctor Rush
- `manifest.webmanifest`: cài ứng dụng, landscape + fullscreen
- `sw.js`: offline cache + tự kiểm tra bản cập nhật mới
- `icon-192.png`, `icon-512.png`: icon bác sĩ từ vai trở lên
- `apple-touch-icon.png`: icon cho iPhone/iPad
- `logo-gpp.png`: logo GPP trong game

## Cấp độ
- Dễ: vật cản trên không 8–12%, sát thương tối đa -2, gần như không combo lúc đầu.
- Trung bình: cân bằng, vật cản trên không 18–30%, sát thương tối đa -4.
- Khó: vật cản trên không 30–45%, có vật cản -5 hiếm khoảng 5%.
- Mọi vật cản bay lên/xuống chỉ trừ 1 sinh tồn; chỉ một loại có biên độ lớn để tạo khác biệt.
- Độ khó tăng ở các mốc 250 / 500 / 1000 vật phẩm.

## Điện thoại
- Game tối ưu chơi ngang.
- Khi cầm dọc sẽ hiện yêu cầu xoay ngang.
- Khi mở từ icon PWA đã cài, game dùng chế độ fullscreen/standalone để không còn thanh URL của trình duyệt.
- Khi bấm Chơi ngay trên trình duyệt di động, game cũng thử chuyển fullscreen và khóa ngang nếu trình duyệt cho phép.

## Cập nhật
Service Worker dùng cơ chế network-first cho trang game và tự `update()` khi mở lại/đưa app trở lại màn hình. Cache cũ được xóa khi bản Service Worker mới kích hoạt. Vì vậy sau khi bạn thay file trên GitHub Pages, điện thoại sẽ nhận bản mới mà không cần xóa cache thủ công trong phần lớn trường hợp.

## GitHub Pages
Vào **Settings → Pages → Deploy from a branch → main → /(root)**.

Mỗi lần cập nhật game, thay toàn bộ các file trong repo bằng bộ mới này để `index.html`, `sw.js`, manifest và icon cùng phiên bản.
