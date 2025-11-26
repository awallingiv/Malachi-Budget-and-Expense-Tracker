# Install react-draggable with legacy peer deps to bypass version conflicts
Write-Host "Installing react-draggable with legacy peer deps..." -ForegroundColor Cyan

Set-Location "frontend" -ErrorAction SilentlyContinue

# Install with legacy peer deps to bypass React version conflicts
npm install react-draggable --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ react-draggable installed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Installation failed, using CSS-based fallback instead" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Platform-aware dragging implemented:" -ForegroundColor Yellow
Write-Host "  • Web: Uses react-draggable or CSS fallback" -ForegroundColor White
Write-Host "  • Mobile: Uses PanResponder (touch-optimized)" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Start the app with: npm start" -ForegroundColor Cyan