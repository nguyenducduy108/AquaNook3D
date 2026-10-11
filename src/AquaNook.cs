using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

// Native Windows wallpaper host. The scene belongs to Explorer's desktop HWND,
// never to a top-level overlay, and never changes the user's wallpaper setting.
internal static class Native {
    internal const int STYLE=-16, EXSTYLE=-20;
    internal const long CHILD=0x40000000L, POPUP=0x80000000L, LAYERED=0x80000L;
    internal const long TOOL=0x80L, NOACTIVATE=0x8000000L;
    internal const uint POSITION=0x10|0x20|0x40;
    internal delegate bool EnumProc(IntPtr hwnd, IntPtr param);
    [StructLayout(LayoutKind.Sequential)] internal struct Point { public int X,Y; }
    [StructLayout(LayoutKind.Sequential)] internal struct Rect { public int L,T,R,B; }
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] internal static extern IntPtr FindWindow(string cls,string title);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] internal static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
    [DllImport("user32.dll")] internal static extern bool EnumWindows(EnumProc callback,IntPtr param);
    [DllImport("user32.dll")] internal static extern IntPtr GetParent(IntPtr h);
    [DllImport("user32.dll")] internal static extern IntPtr SetParent(IntPtr h,IntPtr parent);
    [DllImport("user32.dll")] internal static extern IntPtr GetWindowLongPtr(IntPtr h,int index);
    [DllImport("user32.dll")] internal static extern IntPtr SetWindowLongPtr(IntPtr h,int index,IntPtr value);
    [DllImport("user32.dll")] internal static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
    [DllImport("user32.dll")] internal static extern bool SetLayeredWindowAttributes(IntPtr h,uint color,byte alpha,uint flags);
    [DllImport("user32.dll")] internal static extern IntPtr SendMessageTimeout(IntPtr h,uint msg,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
    [DllImport("user32.dll")] internal static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll")] internal static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] internal static extern IntPtr GetWindow(IntPtr h,uint cmd);
    [DllImport("user32.dll")] internal static extern IntPtr GetAncestor(IntPtr h,uint flags);
    [DllImport("user32.dll")] internal static extern bool GetWindowRect(IntPtr h,out Rect r);
    [DllImport("user32.dll")] internal static extern bool GetCursorPos(out Point p);
    [DllImport("user32.dll")] internal static extern IntPtr WindowFromPoint(Point p);
    [DllImport("user32.dll")] internal static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] internal static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")] internal static extern int MapWindowPoints(IntPtr from,IntPtr to,ref Point p,uint count);
    [DllImport("user32.dll")] internal static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] internal static extern uint RegisterWindowMessage(string message);
    [DllImport("user32.dll")] internal static extern bool ShowWindow(IntPtr h,int command);
    [DllImport("user32.dll")] internal static extern bool SystemParametersInfo(uint action,uint param,ref int value,uint flags);
    [DllImport("dwmapi.dll")] internal static extern int DwmGetWindowAttribute(IntPtr h,int attr,out int value,int size);
    [DllImport("user32.dll")] internal static extern IntPtr OpenInputDesktop(uint flags,bool inherit,uint access);
    [DllImport("user32.dll")] internal static extern bool CloseDesktop(IntPtr desktop);
    internal static long Bits(IntPtr h,int index) { return GetWindowLongPtr(h,index).ToInt64(); }
    internal static void Bits(IntPtr h,int index,long value) { SetWindowLongPtr(h,index,new IntPtr(value)); }
    internal static string Class(IntPtr h) { var s=new System.Text.StringBuilder(256); GetClassName(h,s,s.Capacity);return s.ToString(); }
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,System.Text.StringBuilder s,int size);
}

internal sealed class DesktopLayer {
    internal IntPtr Parent, Icons, Worker;
    internal bool Raised;
    internal static DesktopLayer Find(bool create) {
        IntPtr prog=Native.FindWindow("Progman",null);
        if(prog==IntPtr.Zero) return null;
        if(create) { IntPtr ignored; Native.SendMessageTimeout(prog,0x052c,new IntPtr(13),new IntPtr(1),2,1000,out ignored); }
        var layer=new DesktopLayer();
        layer.Raised=(Native.Bits(prog,Native.EXSTYLE)&0x00200000L)!=0;
        Native.EnumWindows(delegate(IntPtr hwnd,IntPtr unused) {
            var icons=Native.FindWindowEx(hwnd,IntPtr.Zero,"SHELLDLL_DefView",null);
            if(icons==IntPtr.Zero)return true;
            layer.Icons=icons;
            if(layer.Raised && hwnd==prog) {
                layer.Parent=prog;
                layer.Worker=Native.FindWindowEx(prog,IntPtr.Zero,"WorkerW",null);
            } else {
                layer.Raised=false;
                layer.Parent=Native.FindWindowEx(IntPtr.Zero,hwnd,"WorkerW",null);
                layer.Worker=layer.Parent;
            }
            return false;
        },IntPtr.Zero);
        // No top-level fallback: failure must be visible in the tray, not cover icons.
        return layer.Parent!=IntPtr.Zero && layer.Icons!=IntPtr.Zero ? layer : null;
    }
    internal void Attach(IntPtr hwnd,Rectangle bounds) {
        Native.Bits(hwnd,Native.STYLE,(Native.Bits(hwnd,Native.STYLE)|Native.CHILD)&~Native.POPUP);
        long ex=(Native.Bits(hwnd,Native.EXSTYLE)|Native.TOOL|Native.NOACTIVATE)&~0x40000L;
        if(Raised)ex|=Native.LAYERED;
        Native.Bits(hwnd,Native.EXSTYLE,ex);
        if(Raised && !Native.SetLayeredWindowAttributes(hwnd,0,255,2))throw new Exception("Không tạo được lớp desktop trong suốt.");
        Native.SetParent(hwnd,Parent);
        if(Native.GetParent(hwnd)!=Parent)throw new Exception("Không gắn được cảnh vào Explorer.");
        var point=new Native.Point { X=bounds.Left,Y=bounds.Top };
        Native.MapWindowPoints(IntPtr.Zero,Parent,ref point,1);
        if(!Native.SetWindowPos(hwnd,Raised?Icons:IntPtr.Zero,point.X,point.Y,bounds.Width,bounds.Height,Native.POSITION))
            throw new Exception("Không đặt được kích thước wallpaper.");
        if(Raised && Worker!=IntPtr.Zero)Native.SetWindowPos(Worker,new IntPtr(1),0,0,0,0,0x10|1|2);
    }
    internal bool Healthy(IntPtr h) { return Native.IsWindow(h)&&Native.IsWindow(Parent)&&Native.IsWindow(Icons)&&Native.GetParent(h)==Parent&&(!Raised||(Native.IsWindow(Worker)&&Native.GetParent(Worker)==Parent)); }
    internal bool IsDesktopPoint(Native.Point p) {
        IntPtr h=Native.WindowFromPoint(p);
        for(int i=0;i<12 && h!=IntPtr.Zero;i++,h=Native.GetParent(h)) {
            if(h==Icons || h==Parent || h==Worker)return true;
            string c=Native.Class(h);
            if(c=="Shell_TrayWnd" || c=="Shell_SecondaryTrayWnd")return false;
        }
        return false;
    }
}

internal sealed class Settings {
    public string Scene="reefscape";
    public string Quality="native";
    public bool Paused=false;
    internal static readonly string Folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"AquaNook3D");
    internal static string FilePath { get { return Path.Combine(Folder,"settings.json"); } }
    internal static Settings Load() {
        try { var s=Program.Json.Deserialize<Settings>(File.ReadAllText(FilePath));
            if(!new[]{"reefscape","riverscape","bettascape"}.Contains(s.Scene))s.Scene="reefscape";
            if(!new[]{"eco","balanced","detail","native"}.Contains(s.Quality))s.Quality="native";
            return s;
        } catch { int enabled=1;Native.SystemParametersInfo(0x1042,0,ref enabled,0);return new Settings { Paused=enabled==0 }; }
    }
    internal void Save() { Directory.CreateDirectory(Folder);File.WriteAllText(FilePath,Program.Json.Serialize(this)); }
}

internal sealed class Wallpaper : Form {
    internal readonly Screen Monitor;
    internal DesktopLayer Layer;
    internal WebView2 View;
    internal bool Ready,Failed;
    internal object Stats;
    internal IntPtr AttachedHandle;
    readonly AquariumContext host;
    internal Wallpaper(AquariumContext owner,Screen screen,DesktopLayer layer) {
        host=owner;Monitor=screen;Layer=layer;
        Text="Aqua Nook 3D · Desktop";FormBorderStyle=FormBorderStyle.None;
        ShowInTaskbar=false;StartPosition=FormStartPosition.Manual;Bounds=screen.Bounds;
        AutoScaleMode=AutoScaleMode.None;BackColor=Color.FromArgb(4,17,25);
        View=new WebView2 { Dock=DockStyle.Fill,DefaultBackgroundColor=BackColor,TabStop=false };
        Controls.Add(View);
    }
    protected override bool ShowWithoutActivation { get { return true; } }
    protected override CreateParams CreateParams {
        get { var p=base.CreateParams;p.ExStyle|=(int)(Native.TOOL|Native.NOACTIVATE);return p; }
    }
    protected override void WndProc(ref Message m) {
        if(m.Msg==0x21) { m.Result=new IntPtr(3);return; }
        if(m.Msg==0x84) { m.Result=new IntPtr(-1);return; }
        base.WndProc(ref m);
    }
    internal async Task Initialize(CoreWebView2Environment environment) {
        var handle=Handle;View.CreateControl();
        await View.EnsureCoreWebView2Async(environment);
        if(IsDisposed||host.Closing)return;
        var core=View.CoreWebView2;
        core.Settings.AreDefaultContextMenusEnabled=false;
        core.Settings.AreDevToolsEnabled=false;core.Settings.AreBrowserAcceleratorKeysEnabled=false;
        core.Settings.IsStatusBarEnabled=false;core.Settings.IsZoomControlEnabled=false;
        core.Settings.IsBuiltInErrorPageEnabled=false;
        core.SetVirtualHostNameToFolderMapping("aquarium.local",Path.Combine(Program.Base,"site"),CoreWebView2HostResourceAccessKind.DenyCors);
        core.NavigationStarting+=(s,e)=>{ if(!e.Uri.StartsWith("https://aquarium.local/",StringComparison.Ordinal))e.Cancel=true; };
        core.NewWindowRequested+=(s,e)=>e.Handled=true;
        core.PermissionRequested+=(s,e)=>e.State=CoreWebView2PermissionState.Deny;
        core.DownloadStarting+=(s,e)=>e.Cancel=true;
        core.ProcessFailed+=(s,e)=>{Failed=true;Program.Log("WebView process failed: "+e.ProcessFailedKind);host.ScheduleRebuild();};
        core.WebMessageReceived+=(s,e)=>OnMessage(e.WebMessageAsJson);
        core.NavigationCompleted+=(s,e)=>{ if(!e.IsSuccess)host.Error("Không tải được cảnh 3D: "+e.WebErrorStatus); };
        AttachedHandle=Handle;
        Layer.Attach(AttachedHandle,Monitor.Bounds);
        Show();Layer.Attach(Handle,Monitor.Bounds);
        Navigate();
    }
    internal void Navigate() {
        if(IsDisposed||View.CoreWebView2==null||host.Closing)return;
        Ready=false;
        View.CoreWebView2.Navigate("https://aquarium.local/scenes/"+host.Preferences.Scene+"/wallpaper.html");
    }
    void OnMessage(string json) {
        try {
            var msg=Program.Json.Deserialize<Dictionary<string,object>>(json);
            string type=msg.ContainsKey("type")?Convert.ToString(msg["type"]):"";
            if(type=="ready") { Ready=true;Failed=false;Configure();host.UpdateStatus();Program.Log("ready "+Monitor.DeviceName+" "+host.Preferences.Scene); }
            if(type=="stats"){Stats=msg;host.Record(this,json);}
            if(type=="error") { Ready=false;Failed=true;Send(new{type="rate",value=0});Program.Log(json);host.Error("Lỗi cảnh 3D. Chọn tải lại hoặc xem nhật ký."); }
        } catch(Exception ex) { Program.Log(ex.ToString()); }
    }
    internal void Send(object message) { if(View.CoreWebView2!=null && !IsDisposed)View.CoreWebView2.PostWebMessageAsJson(Program.Json.Serialize(message)); }
    internal void Configure() {
        Send(new{type="quality",value=host.Preferences.Quality});
        Send(new{type="pause",value=host.Preferences.Paused});
        Send(new{type="power",value=SystemInformation.PowerStatus.PowerLineStatus==PowerLineStatus.Offline});
        Send(new{type="rate",value=host.TargetRate});
    }
    internal async Task CaptureFrame(string file) {
        using(var stream=File.Create(file))await View.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,stream);
    }
}

// An independent message window survives child HWND destruction during an Explorer restart.
internal sealed class ShellListener : NativeWindow,IDisposable {
    readonly uint taskbar;readonly Action changed;
    internal ShellListener(Action callback) { changed=callback;taskbar=Native.RegisterWindowMessage("TaskbarCreated");CreateHandle(new CreateParams { Caption="AquaNook3D lifecycle",ExStyle=0x80 }); }
    protected override void WndProc(ref Message m) {
        if((uint)m.Msg==taskbar || m.Msg==0x7e)changed();
        base.WndProc(ref m);
    }
    public void Dispose() { DestroyHandle(); }
}

internal sealed class AquariumContext : ApplicationContext {
    internal readonly Settings Preferences=Settings.Load();
    readonly List<Wallpaper> walls=new List<Wallpaper>();
    readonly NotifyIcon tray;
    readonly ContextMenuStrip menu=new ContextMenuStrip();
    readonly System.Windows.Forms.Timer pulse=new System.Windows.Forms.Timer { Interval=50 };
    readonly ShellListener listener;
    readonly ToolStripMenuItem pause,status;
    CoreWebView2Environment environment;
    bool building,closing,rebuild,locked,lastClick;
    internal bool Closing { get { return closing; } }
    internal int TargetRate { get { return Preferences.Quality=="native"||Preferences.Quality=="detail"?60:Preferences.Quality=="eco"?20:30; } }
    int ticks;
    DateTime retryAt=DateTime.MinValue;
    readonly string diagnostics;
    internal AquariumContext(string diagnosticPath) {
        diagnostics=diagnosticPath;
        status=new ToolStripMenuItem("Đang khởi động cảnh 3D…") { Enabled=false };menu.Items.Add(status);
        var scenes=new ToolStripMenuItem("Bể cá");
        AddChoice(scenes,"Rạn san hô","reefscape",true);AddChoice(scenes,"Dòng suối","riverscape",true);AddChoice(scenes,"Cá betta","bettascape",true);menu.Items.Add(scenes);
        menu.Items.Add("Cho cá ăn",null,(s,e)=>Feed());
        pause=new ToolStripMenuItem("Tạm dừng",null,(s,e)=>{ Preferences.Paused=!Preferences.Paused;Preferences.Save();Configure(); });menu.Items.Add(pause);
        var quality=new ToolStripMenuItem("Chất lượng");
        AddChoice(quality,"Tiết kiệm · 20 fps","eco",false);AddChoice(quality,"Cân bằng · 30 fps","balanced",false);AddChoice(quality,"Sắc nét · 60 fps","native",false);AddChoice(quality,"Mượt nhẹ · 60 fps","detail",false);menu.Items.Add(quality);
        var startup=new ToolStripMenuItem("Khởi động cùng Windows");
        startup.Click+=(s,e)=> {try {using(var key=Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")){if(key.GetValue("AquaNook3D")!=null)key.DeleteValue("AquaNook3D",false);else key.SetValue("AquaNook3D","\""+Application.ExecutablePath+"\"");}}catch(Exception ex){Error(ex.Message);} };
        menu.Items.Add(startup);
        menu.Opening+=(s,e)=>{using(var key=Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))startup.Checked=key!=null&&key.GetValue("AquaNook3D")!=null;};
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Hướng dẫn",null,(s,e)=>MessageBox.Show("Di chuyển chuột trên desktop để cá phản ứng.\nGiữ Ctrl rồi bấm chuột trái trên desktop để cho ăn.\nHoặc chọn 'Cho cá ăn' ở menu này.\n\nIcon, kéo thả và Win+D vẫn thuộc Windows.\nĐóng wallpaper bằng 'Thoát' để hiện lại nền cũ.\n\nCảnh 3D: Deskworlds / chaseleantj (MIT).", "Aqua Nook 3D"));
        menu.Items.Add("Tải lại wallpaper",null,(s,e)=>ScheduleRebuild());
        menu.Items.Add("Mở nhật ký",null,(s,e)=>System.Diagnostics.Process.Start("notepad.exe",Program.LogPath));
        menu.Items.Add("Thoát",null,(s,e)=>ExitThread());
        menu.Opening+=(s,e)=>UpdateChecks();
        tray=new NotifyIcon { Icon=SystemIcons.Application,Text="Aqua Nook 3D",ContextMenuStrip=menu,Visible=true };
        tray.DoubleClick+=(s,e)=>Feed();
        listener=new ShellListener(ScheduleRebuild);
        Microsoft.Win32.SystemEvents.SessionSwitch+=SessionChanged;
        pulse.Tick+=Tick;pulse.Start();
        Start();
    }
    void AddChoice(ToolStripMenuItem parent,string label,string value,bool scene) {
        var item=new ToolStripMenuItem(label) { Tag=value };
        item.Click+=(s,e)=> { if(scene) { Preferences.Scene=value;foreach(var w in walls)w.Navigate(); }else{Preferences.Quality=value;Configure();}Preferences.Save();UpdateChecks(); };
        parent.DropDownItems.Add(item);
    }
    void UpdateChecks() {
        pause.Text=Preferences.Paused?"Tiếp tục bơi":"Tạm dừng";
        foreach(ToolStripItem top in menu.Items) {var group=top as ToolStripMenuItem;if(group==null)continue;
            foreach(ToolStripItem sub in group.DropDownItems) {var item=sub as ToolStripMenuItem;if(item!=null)item.Checked=Convert.ToString(item.Tag)==Preferences.Scene || Convert.ToString(item.Tag)==Preferences.Quality;}}
    }
    async void Start() {
        try {
            Directory.CreateDirectory(Settings.Folder);
            var options=new CoreWebView2EnvironmentOptions("--disable-background-timer-throttling --disable-renderer-backgrounding --disable-features=CalculateNativeWinOcclusion");
            environment=await CoreWebView2Environment.CreateAsync(null,Path.Combine(Settings.Folder,"WebView2"),options);
            if(closing)return;
            await Build();
            if(diagnostics!=null)DiagnosticRun();
        } catch(Exception ex) { if(!closing)Error("Không khởi động được: "+ex.Message);Program.Log(ex.ToString()); }
    }
    async Task Build() {
        if(building||closing)return;building=true;rebuild=false;
        try {
            foreach(var w in walls)w.Dispose();walls.Clear();
            var layer=DesktopLayer.Find(true);
            if(layer==null) { Error("Đang chờ desktop Explorer…");rebuild=true;retryAt=DateTime.UtcNow.AddSeconds(3);return; }
            foreach(var screen in Screen.AllScreens) {
                if(closing)break;
                var w=new Wallpaper(this,screen,layer);walls.Add(w);
                await w.Initialize(environment);
                if(closing||w.IsDisposed)break;
                Program.Log("attached "+screen.DeviceName+" HWND="+w.AttachedHandle+" parent="+Native.GetParent(w.AttachedHandle)+" raised="+layer.Raised);
            }
        }catch(Exception ex){if(!closing){Error(ex.Message);Program.Log(ex.ToString());rebuild=true;retryAt=DateTime.UtcNow.AddSeconds(5);}}
        finally {building=false;}
    }
    internal void ScheduleRebuild() {if(closing||rebuild)return;rebuild=true;retryAt=DateTime.UtcNow.AddSeconds(2);}
    internal void UpdateStatus() {
        status.Text=walls.Count>0&&walls.All(w=>w.Ready)?"Đang chạy dưới icon desktop":"Đang tải cảnh 3D…";UpdateChecks();
    }
    internal void Error(string message) {if(closing)return;bool changed=status.Text!=message;status.Text=message;if(changed)tray.ShowBalloonTip(5000,"Aqua Nook 3D",message,ToolTipIcon.Warning);}
    internal void Record(Wallpaper w,string json) {
        if(diagnostics==null||closing)return;
        try {Directory.CreateDirectory(diagnostics);File.WriteAllText(Path.Combine(diagnostics,"live-"+walls.IndexOf(w)+".json"),json);}catch(IOException){}
    }
    void Configure() {foreach(var w in walls)if(w.Ready)w.Configure();UpdateStatus();}
    void Feed() {foreach(var w in walls)if(w.Ready)w.Send(new{type="feed"});}
    void SessionChanged(object s,Microsoft.Win32.SessionSwitchEventArgs e) {
        if(e.Reason==Microsoft.Win32.SessionSwitchReason.SessionLock)locked=true;
        if(e.Reason==Microsoft.Win32.SessionSwitchReason.SessionUnlock)locked=false;
    }
    async void Tick(object sender,EventArgs args) {
        if(closing||building||environment==null)return;
        if(rebuild && DateTime.UtcNow>=retryAt){await Build();return;}
        ticks++;
        Native.Point point;Native.GetCursorPos(out point);
        bool click=(Native.GetAsyncKeyState(1)&0x8000)!=0,ctrl=(Native.GetAsyncKeyState(0x11)&0x8000)!=0;
        foreach(var w in walls.ToArray()) {
            if(w.IsDisposed || !w.IsHandleCreated || !w.Layer.Healthy(w.AttachedHandle)){ScheduleRebuild();return;}
            if(!w.Ready)continue;
            bool inside=w.Monitor.Bounds.Contains(point.X,point.Y)&&!locked&&w.Layer.IsDesktopPoint(point);
            w.Send(new{type="pointer",inside=inside,x=(point.X-w.Monitor.Bounds.Left)/(double)w.Monitor.Bounds.Width,y=(point.Y-w.Monitor.Bounds.Top)/(double)w.Monitor.Bounds.Height});
            if(inside&&click&&!lastClick&&ctrl)w.Send(new{type="feed"});
            if(ticks%20==0) {
                bool battery=SystemInformation.PowerStatus.PowerLineStatus==PowerLineStatus.Offline;
                int rate=TargetRate;
                bool covered=IsCovered(w);
                w.Send(new{type="power",value=battery});
                w.Send(new{type="rate",value=locked||covered?0:battery?Math.Min(rate,30):rate});
                w.Send(new{type="stats"});
                // Shell animations can reorder siblings; repair inside the parent only.
                if(w.Layer.Raised)Native.SetWindowPos(w.AttachedHandle,w.Layer.Icons,0,0,0,0,0x10|1|2);
            }
        }
        lastClick=click;
    }
    static bool IsCovered(Wallpaper w) {
        var foreground=Native.GetForegroundWindow();
        if(foreground==IntPtr.Zero||foreground==w.Layer.Parent||foreground==w.Layer.Icons)return false;
        if(!Native.IsWindowVisible(foreground))return false;
        string cls=Native.Class(foreground);if(cls=="Progman"||cls=="WorkerW"||cls=="Shell_TrayWnd")return false;
        int cloaked;Native.DwmGetWindowAttribute(foreground,14,out cloaked,4);if(cloaked!=0)return false;
        Native.Rect r;if(!Native.GetWindowRect(foreground,out r))return false;
        var b=w.Monitor.WorkingArea;
        return r.L<=b.Left&&r.T<=b.Top&&r.R>=b.Right&&r.B>=b.Bottom;
    }
    async void DiagnosticRun() {
        try {
            Directory.CreateDirectory(diagnostics);
            for(int i=0;i<90&&!closing;i++){if(walls.Count>0&&walls.All(w=>w.Ready))break;await Task.Delay(1000);}
            if(closing)return;
            // Diagnostics render independently of coverage to exercise the simulation.
            pulse.Stop();
            foreach(var w in walls){w.Send(new{type="rate",value=TargetRate});w.Send(new{type="pause",value=false});}
            await Task.Delay(4000);await Snapshot("before");
            foreach(var w in walls)w.Send(new{type="feed"});
            await Task.Delay(700);await Snapshot("fed");
            await Task.Delay(6000);await Snapshot("swimming");
            foreach(var w in walls)w.Send(new{type="pause",value=true});
            await Task.Delay(500);await Snapshot("paused");
            await Task.Delay(2000);await Snapshot("paused-later");
            string originalScene=Preferences.Scene;
            foreach(string scene in new[]{"riverscape","bettascape"}) {
                Preferences.Scene=scene;foreach(var w in walls)w.Navigate();
                for(int i=0;i<60&&!closing;i++){if(walls.All(w=>w.Ready))break;await Task.Delay(500);}
                if(closing)return;
                foreach(var w in walls){w.Send(new{type="rate",value=TargetRate});w.Send(new{type="pause",value=false});}
                await Task.Delay(2500);await Snapshot(scene);
                foreach(var w in walls)w.Send(new{type="feed"});
                await Task.Delay(1000);await Snapshot(scene+"-fed");
            }
            Preferences.Scene=originalScene;
            // Close only our own child. The watchdog must recover without Explorer restart.
            foreach(var w in walls)w.Close();pulse.Start();
            for(int i=0;i<90&&!closing;i++){await Task.Delay(500);if(walls.Count>0&&walls.All(w=>!w.IsDisposed&&w.Ready&&w.IsHandleCreated&&w.Layer.Healthy(w.AttachedHandle)))break;}
            if(closing)return;
            await Snapshot("recovered");
            foreach(var w in walls)w.Configure();
            File.WriteAllText(Path.Combine(diagnostics,"complete.txt"),"Diagnostics finished. Wallpaper left running; use --quit to close.");
        }catch(Exception ex){Program.Log(ex.ToString());File.WriteAllText(Path.Combine(diagnostics,"error.txt"),ex.ToString());pulse.Start();}
    }
    async Task Snapshot(string name) {
        int index=0;
        foreach(var w in walls) {
            w.Send(new{type="stats"});await Task.Delay(250);
            await w.CaptureFrame(Path.Combine(diagnostics,name+"-"+index+".png"));
            var hwnd=w.AttachedHandle;
            var data=new {hwnd=hwnd.ToInt64(),parent=Native.GetParent(hwnd).ToInt64(),shell=w.Layer.Parent.ToInt64(),icons=w.Layer.Icons.ToInt64(),raised=w.Layer.Raised,child=(Native.Bits(hwnd,Native.STYLE)&Native.CHILD)!=0,visible=Native.IsWindowVisible(hwnd),bounds=w.Monitor.Bounds,ready=w.Ready,stats=w.Stats};
            File.WriteAllText(Path.Combine(diagnostics,name+"-"+index+".json"),Program.Json.Serialize(data));index++;
        }
    }
    protected override void ExitThreadCore() {
        closing=true;pulse.Stop();pulse.Dispose();
        Microsoft.Win32.SystemEvents.SessionSwitch-=SessionChanged;
        foreach(var w in walls)w.Dispose();walls.Clear();
        tray.Visible=false;tray.Dispose();menu.Dispose();listener.Dispose();base.ExitThreadCore();
    }
}

internal static class Program {
    internal static readonly string Base=AppDomain.CurrentDomain.BaseDirectory;
    internal static readonly JavaScriptSerializer Json=new JavaScriptSerializer();
    internal static string LogPath {get {return Path.Combine(Settings.Folder,"wallpaper.log");}}
    internal static void Log(string message) {try{Directory.CreateDirectory(Settings.Folder);File.AppendAllText(LogPath,DateTime.Now.ToString("s")+" "+message+Environment.NewLine);}catch{}}
    [STAThread] static void Main(string[] args) {
        Native.SetProcessDpiAwarenessContext(new IntPtr(-4));
        bool created;
        using(var quit=new EventWaitHandle(false,EventResetMode.AutoReset,"Local\\AquaNook3D.Quit"))
        using(var mutex=new Mutex(true,"Local\\AquaNook3D.Instance",out created)) {
            if(args.Contains("--quit")){quit.Set();return;}
            if(!created){MessageBox.Show("Bể cá đang chạy. Mở biểu tượng Aqua Nook 3D ở khay hệ thống.","Aqua Nook 3D");return;}
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException+=(s,e)=>Log(e.Exception.ToString());
            string diagnostic=null;int i=Array.IndexOf(args,"--diagnostic");if(i>=0&&i+1<args.Length)diagnostic=Path.GetFullPath(args[i+1]);
            var context=new AquariumContext(diagnostic);
            var shutdown=new System.Windows.Forms.Timer { Interval=250 };
            shutdown.Tick+=(s,e)=>{if(quit.WaitOne(0))context.ExitThread();};shutdown.Start();
            Application.Run(context);shutdown.Dispose();
        }
    }
}
