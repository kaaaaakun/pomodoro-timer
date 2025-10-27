"use strict";
const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;
let currentMode = 'work';
let timeRemaining = WORK_TIME;
let timerInterval = null;
let isRunning = false;
const timeDisplay = document.getElementById('timeDisplay');
const modeLabel = document.getElementById('modeLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
/**
 * Update the timer display
 */
function updateDisplay() {
    timeDisplay.textContent = formatTime(timeRemaining);
    modeLabel.textContent = currentMode === 'work' ? '作業時間' : '休憩時間';
}
/**
 * Switch between work and break modes
 */
function switchMode() {
    currentMode = currentMode === 'work' ? 'break' : 'work';
    timeRemaining = currentMode === 'work' ? WORK_TIME : BREAK_TIME;
    updateDisplay();
    // タイマー完了の通知
    const modeName = currentMode === 'work' ? '作業' : '休憩';
    alert(`${currentMode === 'work' ? '休憩' : '作業'}が終了しました！${modeName}を開始してください。`);
}
/**
 * Timer tick function
 */
function tick() {
    if (timeRemaining > 0) {
        timeRemaining--;
        updateDisplay();
    }
    else {
        stopTimer();
        switchMode();
    }
}
/**
 * Start the timer
 */
function startTimer() {
    if (isRunning)
        return;
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    timerInterval = window.setInterval(tick, 1000);
}
/**
 * Pause the timer
 */
function pauseTimer() {
    if (!isRunning)
        return;
    stopTimer();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}
/**
 * Stop the timer interval
 */
function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
}
/**
 * Reset the timer
 */
function resetTimer() {
    stopTimer();
    currentMode = 'work';
    timeRemaining = WORK_TIME;
    updateDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}
// イベントリスナーの設定
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
// 初期表示
updateDisplay();
