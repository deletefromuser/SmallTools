#Get Logged in User and store in Variable

$loggedInUser =  (get-wmiobject  win32_computersystem).username

#Add $loggedInUser User to Remote Desktop Group

Add-LocalGroupMember -group "Hyper-V Administrators" -member $loggedInUser -ErrorAction SilentlyContinue

