# Kiểm thử ngày 05/10/2026

Môi trường thực tế: Windows với raised desktop (Progman có WS_EX_NOREDIRECTIONBITMAP), một màn hình 2560×1440, WebView2 154.0.4258.53. Kết quả dưới đây thuộc bản sáu loài cá và sửa chuyển động vây cuối cùng.

## Cảnh 3D và chuyển động

- 11 bộ kiểm thử JavaScript đạt: cầu nối host, hành vi/cho ăn, ngân sách render, topology mô hình, sáu dáng cá, định hướng và chuyển động vây.
- GPU WebGL2 biên dịch và render cả ba cảnh; không có lỗi shader trong các lần chụp cuối.
- Rạn san hô: 19 cá, 6 nhóm mô hình 3D, 2 tôm; 1.835.896 tam giác trong lượt render được ghi nhận. Các cá thay đổi cả X, Y, Z, hướng và pha đuôi.
- Sau khi cho ăn, số thức ăn tăng từ 0 lên 8; lượt kiểm thử tiếp theo ghi nhận đã ăn đủ 8 viên.
- Chế độ native: render callback đo khoảng 60,00 fps ở framebuffer 2560×1440, p95 khoảng cách khung hình 16,8 ms trong cửa sổ đo 180 khung hình. Đây là số đo của lượt kiểm thử, không phải cam kết tốc độ cho mọi máy/cảnh.
- Hai ảnh chụp sau khi tạm dừng, cách nhau hai giây, giống hệt từng byte. Thời gian mô phỏng không tăng.
- Kiểm thử phase bao gồm quay vòng thuận/ngược qua 2π, nội suy quaternion và 200 lần cập nhật buffer khi tạm dừng không thay đổi dữ liệu.
- Sửa lỗi GLSL phát hiện trong thử nghiệm: tên biến dành riêng đã được đổi; kiểm thử bổ sung và render GPU sau sửa đều đạt.

## Wallpaper Windows

- GetParent của cửa sổ cảnh trùng HWND Progman; WS_CHILD bật, WS_EX_APPWINDOW tắt. Không có cửa sổ thường hiển thị của host ở cấp top-level.
- Chụp màn hình desktop thực cho thấy icon nằm trên cảnh và taskbar vẫn hiện. Hai lần chụp khác nhau cho thấy cá tiếp tục chuyển động sau Win+D.
- WindowFromPoint trên desktop trả về SysListView32 của Explorer. Bấm thường không cho ăn; Ctrl+bấm thật thả đúng 8 viên thức ăn. Di chuyển chuột được chuyển vào mô phỏng.
- Kéo chọn trên vùng desktop trống vẫn do Explorer xử lý.
- Khi cửa sổ đang hoạt động phủ kín màn hình, host gửi rate=0. Khi desktop lộ ra, cảnh chạy lại.
- Đóng HWND con của chính app: watchdog tạo lại cửa sổ và cảnh, parent vẫn là Progman. Không khởi động lại Explorer trong kiểm thử.
- Thoát và mở lại được kiểm tra nhiều lần. Host không gọi API thay đổi hình nền tĩnh.

## Phạm vi chưa xác minh thực tế

Chưa kiểm thử trên Windows 10/classic WorkerW, nhiều màn hình, thay đổi DPI khi đang chạy, khóa/mở máy thực tế hoặc khởi động lại toàn bộ Explorer. Các nhánh xử lý tương ứng có trong host; không xem đó là bằng chứng đã chạy thử. Những loài thêm mới dùng hành vi di chuyển chung, không mô phỏng tập tính riêng từng loài.

Nhật ký hồi quy và telemetry rút gọn đi kèm trong `verification`. `preview.png` là ảnh render WebView2 của bản cuối, không phải tài nguyên nền dùng để di chuyển cá.

