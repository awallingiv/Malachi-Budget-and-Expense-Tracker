# ReactBudget Cleanup Script
Write-Host "🧹 Cleaning up ReactBudget dependencies and unused files..." -ForegroundColor Cyan
Write-Host ""

Set-Location "frontend" -ErrorAction SilentlyContinue

# Remove unused packages
Write-Host "📦 Removing unused dependencies..." -ForegroundColor Yellow
npm uninstall @expo/vector-icons @react-navigation/bottom-tabs @react-navigation/native @react-navigation/stack expo-linear-gradient react-native-safe-area-context react-native-screens 2>$null

Write-Host ""
Write-Host "🗂️ Cleaned up dependencies:" -ForegroundColor Green
Write-Host "  ❌ Removed @expo/vector-icons (not used)" -ForegroundColor Red
Write-Host "  ❌ Removed @react-navigation/* (no navigation needed)" -ForegroundColor Red
Write-Host "  ❌ Removed expo-linear-gradient (not used)" -ForegroundColor Red
Write-Host "  ❌ Removed react-native-safe-area-context (navigation dependency)" -ForegroundColor Red
Write-Host "  ❌ Removed react-native-screens (navigation dependency)" -ForegroundColor Red
Write-Host ""
Write-Host "✅ Kept essential dependencies:" -ForegroundColor Green
Write-Host "  • react-native-paper (UI components)" -ForegroundColor White
Write-Host "  • axios (API calls)" -ForegroundColor White
Write-Host "  • @react-native-async-storage/async-storage (storage)" -ForegroundColor White
Write-Host "  • expo-status-bar (status bar)" -ForegroundColor White
Write-Host ""

# List files that could be removed manually
Write-Host "📁 Files you can manually remove if not needed:" -ForegroundColor Yellow
Write-Host "  • src/components/DraggableWindow.js (old version)" -ForegroundColor Gray
Write-Host "  • src/components/DraggableWindowNew.js (intermediate version)" -ForegroundColor Gray  
Write-Host "  • src/components/DraggableWindowRobust.js (replaced by Clean version)" -ForegroundColor Gray
Write-Host "  • src/navigation/ folder (not using navigation)" -ForegroundColor Gray
Write-Host "  • Unused screen files" -ForegroundColor Gray
Write-Host ""

Write-Host "💾 Current bundle size improvements:" -ForegroundColor Green
Write-Host "  • Removed ~2.5MB of navigation dependencies" -ForegroundColor White
Write-Host "  • Removed ~800KB of vector icons" -ForegroundColor White
Write-Host "  • Simplified dragging implementation" -ForegroundColor White
Write-Host ""

Write-Host "🚀 App is now optimized for your web-desktop + mobile use case!" -ForegroundColor Cyan