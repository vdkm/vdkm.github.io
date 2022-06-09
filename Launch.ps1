Write-Output "This script launch the web application"

$version = node -v
Write-Output $version
IF ($version -eq $null) {
    Write-Output "Node package manager not found. Please install the latest recommended version of Node.js : https://nodejs.org/en/download/"
    pause
    Exit
}

$proxy = npm config get proxy
IF ($proxy -eq "null") {
    Write-Output "No proxy found."
    Write-Output $proxy
    Write-Output "Starting configuration of proxy"
    $username= Read-Host -Prompt "Enter your username"
    $password= Read-Host -Prompt "Enter your password"

    npm config set https-proxy "http://${username}:${password}@appgw.sgp.st.com:8080"
    npm config set proxy "http://${username}:${password}@appgw.sgp.st.com:8080"
    npm set registry http://10.52.183.80:8081/repository/npm_central_registry

    Write-Output "Configuration of proxy done..."
}
Write-Output "Proxy found."
$proxy = npm config get proxy
Write-Output $npm


Write-Output "Installing depedencies..."
npm install

Write-Output "Cleaning port 3000..."
$port = 3000
$foundProcesses = netstat -ano | findstr :$port
$activePortPattern = ":$port\s.+LISTENING\s+\d+$"
$pidNumberPattern = "\d+$"

IF ($foundProcesses | Select-String -Pattern $activePortPattern -Quiet) {
  $matches = $foundProcesses | Select-String -Pattern $activePortPattern
  $firstMatch = $matches.Matches.Get(0).Value

  $pidNumber = [regex]::match($firstMatch, $pidNumberPattern).Value

  taskkill /pid $pidNumber /f
}

Write-Output "Starting..."
npm start
