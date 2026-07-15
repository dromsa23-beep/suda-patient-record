# شغّل هذا الملف في PowerShell
# استبدل YOUR_TOKEN_HERE بالـ token الفعلي

$TOKEN = "YOUR_TOKEN_HERE"
$env:GH_TOKEN = $TOKEN
$env:GITHUB_TOKEN = $TOKEN

Set-Location "C:\Users\اليفق\Desktop\lecture\Suda-FARM"
git remote set-url origin https://$TOKEN@github.com/dromsa23-beep/suda-patient-record.git
git push origin main --force

Write-Host "تم الرفع بنجاح!"
