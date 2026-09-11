# Doctor Rush • Trường GPP — v1.0.25

Bản PWA tĩnh dành cho GitHub Pages. Bản này bổ sung **AUTO đồ họa thích ứng** và giao diện **xếp hạng online**.

## 1) Cài lên GitHub Pages
- Đưa toàn bộ file trong ZIP vào thư mục gốc repository.
- GitHub → Settings → Pages → Deploy from a branch → `main` → `/(root)`.
- Không cần GitHub Actions.
- Service Worker tự đổi cache sang `doctor-rush-v25`, không ép tải lại giữa ván.

## 2) Đồ họa thích ứng
Trong menu có nút **Đồ họa** với 4 lựa chọn:
- **AUTO**: mặc định. Nhận diện sơ bộ mobile/PC, RAM/CPU nếu trình duyệt cho phép; sau đó ưu tiên FPS thực tế để tự đổi chất lượng.
- **Tiết kiệm**: DPR thấp, ít particle/hậu cảnh, tắt blur nặng, render 30 FPS.
- **Cân bằng**: DPR trung bình, hiệu ứng vừa, ưu tiên render 60 FPS.
- **Cao**: hiệu ứng đầy đủ, DPR cao hơn, ưu tiên render 60 FPS.

Gameplay/va chạm vẫn mô phỏng cố định 60 bước/giây. Render hình ảnh được giới hạn riêng, nên màn hình 90/120 Hz không làm GPU vẽ dư 90/120 lần mỗi giây.

Mở URL với `?debug=1` để xem RAF FPS, render FPS, render cap, mode, quality và DPR.

## 3) Xếp hạng online — Supabase
Bản game đã có đầy đủ UI và code gọi Supabase qua REST RPC, nhưng **mặc định tắt** để ZIP không chứa khóa dự án của bạn.

### Thiết lập một lần
1. Tạo/chọn project Supabase.
2. Vào **SQL Editor** và chạy toàn bộ file `supabase-leaderboard.sql`.
3. Trong Supabase → Project Settings/API, lấy:
   - Project URL
   - anon/public key
4. Mở `leaderboard-config.js` và sửa:

```js
window.DOCTOR_RUSH_LEADERBOARD = {
  enabled: true,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_ANON_PUBLIC_KEY',
  season: 1
};
```

**Không dùng service_role key** trong file web/GitHub Pages.

### Cách bảng xếp hạng hoạt động
- Riêng từng cấp: Dễ / Trung bình / Khó.
- Bộ lọc: Hôm nay / Tuần này / Mọi thời đại.
- Mỗi người chỉ lấy thành tích tốt nhất trong bộ lọc.
- Có Mùa (`season`) để tách điểm khi cân bằng gameplay thay đổi lớn.
- Khi bắt đầu ván, server cấp `run_id`; khi kết thúc, server kiểm tra thời gian, vật phẩm, GPP và ngưỡng điểm trước khi nhận kết quả.
- Browser không được đọc/ghi trực tiếp các bảng; chỉ được gọi RPC được cấp quyền.
- Nếu chưa cấu hình Supabase hoặc mất mạng, game vẫn chơi bình thường và hiển thị kỷ lục lưu trên thiết bị.

> Chống gian lận phía client không thể tuyệt đối. Cơ chế hiện tại nhằm chặn các điểm giả hiển nhiên và không cho ghi thẳng vào bảng chính. Nếu sau này bảng xếp hạng có giải thưởng thật, nên chuyển phần xác minh sang Edge Function/server riêng và ký telemetry chi tiết hơn.

## 4) Mobile / PWA
- Chơi landscape; cầm dọc sẽ yêu cầu xoay ngang.
- Android: dùng nút `Cài ứng dụng`.
- iPhone/iPad: Safari → Chia sẻ → Thêm vào Màn hình chính.
- Khi mở từ icon đã cài, PWA chạy standalone/fullscreen.
