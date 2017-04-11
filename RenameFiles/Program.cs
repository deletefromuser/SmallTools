﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Management;
using Microsoft.Win32;

namespace RenameFiles {
    public class Program {
        static Program p = null;
        static Program getController() {
            if(p == null) {
                p = new Program();
            }
            return p;
        }
        /// <summary>
        /// 应用程序的主入口点。
        /// </summary>
        [STAThread]
        static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new FormMain(getController()));
        }

        public bool RenameFiles(String desPath, String formatStr) {
            var files = System.IO.Directory.EnumerateFiles(desPath);
            if(formatStr.Length == 0) {
                formatStr = "{0}.jpg";
            }
            int count = 1;
            String newPath = System.IO.Path.Combine(GetDesktopDirectory(), GetBase64String());
            NewDirectory(newPath);
            foreach (String fileName in files) {
                if (new System.IO.FileInfo(fileName).Length > 1024 * 75) {
                    System.IO.File.Copy(fileName, System.IO.Path.Combine(newPath, String.Format(formatStr, count)));
                    count++;
                }
            }
            return true;
        }

        public String GetWin10LockScreenWallPaper() {
            if(IsWindows10()) {
                GetWallPaperDirectory();
            }
             //var name = (from x in new System.Management.ManagementObjectSearcher("SELECT Caption FROM Win32_OperatingSystem").Get().Cast<ManagementObject>()
            //            select x.GetPropertyValue("Caption")).FirstOrDefault();
            //return name != null ? name.ToString() : "Unknown";
            return "";
        }

        public String GetWallPaperDirectory() {
            String desPath = "";
            String doc = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            doc = doc.Substring(0, doc.LastIndexOf("\\"));
            String desTemp = System.IO.Path.Combine(doc, "AppData\\Local\\Packages");
            var files = System.IO.Directory.EnumerateDirectories(desTemp);
            foreach(String t in files) {
                if(t.Contains("Microsoft.Windows.ContentDeliveryManager")) {
                    desPath = t;
                    break;
                }
            }
            if(desPath.Length > 0) {
                desPath = System.IO.Path.Combine(desPath, "LocalState\\Assets");
                return desPath;
            }
            return "";
        }

        public bool IsWin10() {

            return true;
        }

        bool IsWindows10() {
            var reg = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
            string productName = (string)reg.GetValue("ProductName");
            return productName.StartsWith("Windows 10");
        }

        String GetDesktopDirectory() {
            return Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        }

        String GetBase64String() {
            return Convert.ToBase64String(System.Text.Encoding.Default.GetBytes(DateTime.Now.ToString()));
        }

        void NewDirectory(String path) {
            if(!System.IO.Directory.Exists(path)) {
                System.IO.Directory.CreateDirectory(path);
            }
        }
    }
}
