type TimerMode = 'work' | 'break';

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

let currentMode: TimerMode = 'work';
let timeRemaining = WORK_TIME;
let timerInterval: number | null = null;
let isRunning = false;

const timeDisplay = document.getElementById('timeDisplay') as HTMLElement;
const modeLabel = document.getElementById('modeLabel') as HTMLElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Update the timer display
 */
function updateDisplay(): void {
  timeDisplay.textContent = formatTime(timeRemaining);
  modeLabel.textContent = currentMode === 'work' ? '作業時間' : '休憩時間';
}

/**
 * Switch between work and break modes
 */
function switchMode(): void {
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
function tick(): void {
  if (timeRemaining > 0) {
    timeRemaining--;
    updateDisplay();
  } else {
    stopTimer();
    switchMode();
  }
}

/**
 * Start the timer
 */
function startTimer(): void {
  if (isRunning) return;

  isRunning = true;
  startBtn.disabled = true;
  pauseBtn.disabled = false;

  timerInterval = window.setInterval(tick, 1000);
}

/**
 * Pause the timer
 */
function pauseTimer(): void {
  if (!isRunning) return;

  stopTimer();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

/**
 * Stop the timer interval
 */
function stopTimer(): void {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isRunning = false;
}

/**
 * Reset the timer
 */
function resetTimer(): void {
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
