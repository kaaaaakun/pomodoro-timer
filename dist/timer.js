"use strict";
// クエリパラメータから分数を取得（デバッグ用）
const params = new URLSearchParams(window.location.search);
const WORK_TIME = (parseInt(params.get('work') || '25', 10)) * 60;
const BREAK_TIME = (parseInt(params.get('break') || '5', 10)) * 60;
let currentMode = 'work';
let timeRemaining = WORK_TIME;
let timerInterval = null;
let isRunning = false;
let todos = [];
let currentTodoId = null;
let workStartTime = null;
const timeDisplay = document.getElementById('timeDisplay');
const modeLabel = document.getElementById('modeLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const workTimeInfo = document.getElementById('workTimeInfo');
const breakTimeInfo = document.getElementById('breakTimeInfo');
const soundToggle = document.getElementById('soundToggle');
/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
/**
 * Format minutes to display format
 */
function formatMinutes(minutes) {
    if (minutes < 60) {
        return `${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
}
/**
 * Load todos from localStorage
 */
function loadTodos() {
    const stored = localStorage.getItem('pomodoro-todos');
    if (stored) {
        todos = JSON.parse(stored);
    }
}
/**
 * Save todos to localStorage
 */
function saveTodos() {
    localStorage.setItem('pomodoro-todos', JSON.stringify(todos));
}
/**
 * Render todo list
 */
function renderTodos() {
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const todoItem = document.createElement('div');
        todoItem.className = `flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer transition-all duration-200 border-2 ${todo.id === currentTodoId
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-transparent hover:bg-gray-100'}`;
        const todoContent = document.createElement('div');
        todoContent.className = 'flex-1 flex items-center justify-between mr-3';
        const todoText = document.createElement('div');
        todoText.className = 'text-gray-800 flex-1 break-words';
        todoText.textContent = todo.text;
        const todoTime = document.createElement('div');
        todoTime.className = 'ml-4 text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg whitespace-nowrap';
        todoTime.textContent = formatMinutes(todo.workTime);
        todoContent.appendChild(todoText);
        todoContent.appendChild(todoTime);
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex gap-2 items-center flex-shrink-0';
        // 上へ移動ボタン
        if (index > 0) {
            const upBtn = document.createElement('button');
            upBtn.className = 'w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:scale-110';
            upBtn.textContent = '↑';
            upBtn.onclick = (e) => {
                e.stopPropagation();
                moveTodoUp(index);
            };
            buttonGroup.appendChild(upBtn);
        }
        // 下へ移動ボタン
        if (index < todos.length - 1) {
            const downBtn = document.createElement('button');
            downBtn.className = 'w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:scale-110';
            downBtn.textContent = '↓';
            downBtn.onclick = (e) => {
                e.stopPropagation();
                moveTodoDown(index);
            };
            buttonGroup.appendChild(downBtn);
        }
        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all hover:scale-110 text-xl';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        };
        buttonGroup.appendChild(deleteBtn);
        todoItem.appendChild(todoContent);
        todoItem.appendChild(buttonGroup);
        todoItem.onclick = () => {
            selectTodo(todo.id);
        };
        todoList.appendChild(todoItem);
    });
}
/**
 * Add new todo
 */
function addTodo() {
    const text = todoInput.value.trim();
    if (!text)
        return;
    const todo = {
        id: Date.now().toString(),
        text,
        workTime: 0,
        createdAt: Date.now(),
    };
    todos.push(todo);
    saveTodos();
    renderTodos();
    todoInput.value = '';
    todoInput.focus();
}
/**
 * Delete todo
 */
function deleteTodo(id) {
    todos = todos.filter((todo) => todo.id !== id);
    if (currentTodoId === id) {
        currentTodoId = null;
    }
    saveTodos();
    renderTodos();
}
/**
 * Select todo to work on
 */
function selectTodo(id) {
    currentTodoId = id;
    renderTodos();
}
/**
 * Move todo up in the list
 */
function moveTodoUp(index) {
    if (index <= 0)
        return;
    [todos[index - 1], todos[index]] = [todos[index], todos[index - 1]];
    saveTodos();
    renderTodos();
}
/**
 * Move todo down in the list
 */
function moveTodoDown(index) {
    if (index >= todos.length - 1)
        return;
    [todos[index], todos[index + 1]] = [todos[index + 1], todos[index]];
    saveTodos();
    renderTodos();
}
/**
 * Update the timer display
 */
function updateDisplay() {
    timeDisplay.textContent = formatTime(timeRemaining);
    modeLabel.textContent = currentMode === 'work' ? '作業時間' : '休憩時間';
}
/**
 * Play notification sound using Web Audio API
 */
function playNotificationSound() {
    // 音がオフの場合は何もしない
    if (!soundToggle.checked)
        return;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    // 通知音の設定
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}
/**
 * Switch between work and break modes
 */
function switchMode() {
    // 作業時間を記録
    if (currentMode === 'work' && currentTodoId && workStartTime) {
        const workDuration = Math.floor((Date.now() - workStartTime) / 1000 / 60);
        const todo = todos.find((t) => t.id === currentTodoId);
        if (todo) {
            todo.workTime += workDuration;
            saveTodos();
            renderTodos();
        }
    }
    // 通知音を鳴らす
    playNotificationSound();
    // モードを切り替え
    currentMode = currentMode === 'work' ? 'break' : 'work';
    timeRemaining = currentMode === 'work' ? WORK_TIME : BREAK_TIME;
    updateDisplay();
    // 自動的に次のタイマーを開始
    startTimer();
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
    resetBtn.disabled = true;
    // 作業モードの場合、開始時刻を記録
    if (currentMode === 'work') {
        workStartTime = Date.now();
    }
    timerInterval = window.setInterval(tick, 1000);
}
/**
 * Pause the timer
 */
function pauseTimer() {
    if (!isRunning)
        return;
    // 作業時間を記録
    if (currentMode === 'work' && currentTodoId && workStartTime) {
        const workDuration = Math.floor((Date.now() - workStartTime) / 1000 / 60);
        const todo = todos.find((t) => t.id === currentTodoId);
        if (todo) {
            todo.workTime += workDuration;
            saveTodos();
            renderTodos();
        }
        workStartTime = null;
    }
    stopTimer();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
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
    resetBtn.disabled = false;
}
// イベントリスナーの設定
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});
// 初期化
loadTodos();
renderTodos();
updateDisplay();
// 設定時間を表示
workTimeInfo.textContent = (WORK_TIME / 60).toString();
breakTimeInfo.textContent = (BREAK_TIME / 60).toString();
