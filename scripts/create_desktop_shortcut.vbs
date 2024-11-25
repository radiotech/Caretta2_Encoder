Set Shell = CreateObject("WScript.Shell")

Set StartShortcut = Shell.CreateShortcut(Shell.SpecialFolders("Desktop") & "\Caretta2.lnk")
StartShortcut.WindowStyle = 4
StartShortcut.IconLocation = Shell.CurrentDirectory & "\scripts\Caretta2.ico"
StartShortcut.TargetPath = Shell.CurrentDirectory & "\scripts\start.bat"
StartShortcut.Save

Set SetupShortcut = Shell.CreateShortcut(Shell.SpecialFolders("Desktop") & "\Caretta2 Setup.lnk")
SetupShortcut.WindowStyle = 4
SetupShortcut.IconLocation = Shell.CurrentDirectory & "\scripts\Caretta2.ico"
SetupShortcut.TargetPath = Shell.CurrentDirectory & "\scripts\setup.bat"
SetupShortcut.Save
