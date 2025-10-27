"use strict";
// クエリパラメータから分数を取得（デバッグ用）
const params = new URLSearchParams(window.location.search);
const workParam = parseInt(params.get('work') || '25', 10);
const breakParam = parseInt(params.get('break') || '5', 10);
// 不正な値（0以下、NaN、100以上）の場合はデフォルト値を使用
const WORK_TIME = (workParam > 0 && workParam <= 100 && !isNaN(workParam) ? workParam : 25) * 60;
const BREAK_TIME = (breakParam > 0 && breakParam <= 100 && !isNaN(breakParam) ? breakParam : 5) * 60;
let currentMode = 'work';
let timeRemaining = WORK_TIME;
let timerInterval = null;
let isRunning = false;
let todos = [];
let currentTodoId = null;
let sortableInstance = null;
const timeDisplay = document.getElementById('timeDisplay');
const modeLabel = document.getElementById('modeLabel');
const progressBar = document.getElementById('progressBar');
const tomatoIcon = document.getElementById('tomatoIcon');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const soundToggle = document.getElementById('soundToggle');
const tomatoToggle = document.getElementById('tomatoToggle');
const darkModeToggle = document.getElementById('darkModeToggle');
/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
/**
 * Format seconds to display format with hours and minutes
 */
function formatWorkTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}時間${minutes}分`;
    }
    else if (minutes > 0) {
        return `${minutes}分`;
    }
    else {
        return `0分`;
    }
}
/**
 * Load todos from localStorage
 */
function loadTodos() {
    const stored = localStorage.getItem('pomodoro-todos');
    if (stored) {
        todos = JSON.parse(stored);
        // 既存データとの互換性：workTimeが大きい場合は分単位として扱い、秒単位に変換
        todos = todos.map((todo) => {
            if (todo.workTime > 3600) {
                // 1時間（3600秒）より大きい場合は分単位と判断
                return { ...todo, workTime: todo.workTime * 60 };
            }
            return todo;
        });
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
        const isCurrentTask = index === 0 && !todo.completed && isRunning && currentMode === 'work';
        const todoItem = document.createElement('div');
        todoItem.className = `flex items-center gap-3 p-4 rounded-xl transition-all duration-200 border-2 ${isCurrentTask
            ? 'border-green-500 bg-green-50 shadow-lg'
            : todo.id === currentTodoId
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-transparent hover:bg-gray-100 bg-gray-50'} ${todo.completed ? 'opacity-60' : ''}`;
        todoItem.setAttribute('data-id', todo.id);
        // ドラッグハンドル（6つの点）
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0';
        dragHandle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="7" cy="5" r="1.5"/>
        <circle cx="13" cy="5" r="1.5"/>
        <circle cx="7" cy="10" r="1.5"/>
        <circle cx="13" cy="10" r="1.5"/>
        <circle cx="7" cy="15" r="1.5"/>
        <circle cx="13" cy="15" r="1.5"/>
      </svg>
    `;
        // チェックボックス
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.className = 'w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0';
        checkbox.onclick = (e) => {
            e.stopPropagation();
            toggleComplete(todo.id);
        };
        const todoContent = document.createElement('div');
        todoContent.className = 'flex-1 flex items-center justify-between cursor-pointer';
        todoContent.onclick = () => {
            selectTodo(todo.id);
        };
        const todoText = document.createElement('div');
        todoText.className = `flex-1 break-words ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`;
        todoText.textContent = todo.text;
        const todoTime = document.createElement('div');
        todoTime.className = 'ml-4 text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg whitespace-nowrap';
        todoTime.id = `todo-time-${todo.id}`;
        todoTime.textContent = formatWorkTime(todo.workTime);
        todoContent.appendChild(todoText);
        todoContent.appendChild(todoTime);
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex gap-2 items-center flex-shrink-0';
        // 削除ボタン（ゴミ箱アイコン）
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors duration-200 rounded-lg hover:bg-red-50';
        deleteBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5H15M6 4.5V3C6 2.73478 6.10536 2.48043 6.29289 2.29289C6.48043 2.10536 6.73478 2 7 2H11C11.2652 2 11.5196 2.10536 11.7071 2.29289C11.8946 2.48043 12 2.73478 12 3V4.5M14 4.5V15C14 15.2652 13.8946 15.5196 13.7071 15.7071C13.5196 15.8946 13.2652 16 13 16H5C4.73478 16 4.48043 15.8946 4.29289 15.7071C4.10536 15.5196 4 15.2652 4 15V4.5H14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7.5 8V13M10.5 8V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        };
        buttonGroup.appendChild(deleteBtn);
        todoItem.appendChild(dragHandle);
        todoItem.appendChild(checkbox);
        todoItem.appendChild(todoContent);
        todoItem.appendChild(buttonGroup);
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
        completed: false,
        createdAt: Date.now(),
    };
    todos.push(todo);
    saveTodos();
    renderTodos();
    initSortable();
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
    initSortable();
}
/**
 * Select todo to work on
 */
function selectTodo(id) {
    currentTodoId = id;
    renderTodos();
    initSortable();
}
/**
 * Toggle todo completion status
 */
function toggleComplete(id) {
    const todoIndex = todos.findIndex((t) => t.id === id);
    if (todoIndex === -1)
        return;
    const todo = todos[todoIndex];
    todo.completed = !todo.completed;
    // 完了マークをつけた場合、タスクを一番下に移動
    if (todo.completed) {
        todos.splice(todoIndex, 1);
        todos.push(todo);
    }
    saveTodos();
    renderTodos();
    initSortable();
}
/**
 * Initialize SortableJS for drag and drop
 */
function initSortable() {
    if (typeof Sortable === 'undefined')
        return;
    // 既存のインスタンスを破棄
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    sortableInstance = new Sortable(todoList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onStart: (evt) => {
            // ドラッグ開始時に選択状態にする
            const draggedElement = evt.item;
            const todoId = draggedElement.getAttribute('data-id');
            if (todoId) {
                currentTodoId = todoId;
                // ドラッグ中は再レンダリングしない
            }
        },
        onEnd: (evt) => {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
            if (oldIndex !== undefined && newIndex !== undefined) {
                const movedTodo = todos.splice(oldIndex, 1)[0];
                todos.splice(newIndex, 0, movedTodo);
                saveTodos();
                renderTodos();
                initSortable();
            }
        },
    });
}
/**
 * Update the timer display
 */
function updateDisplay() {
    timeDisplay.textContent = formatTime(timeRemaining);
    modeLabel.textContent = currentMode === 'work' ? '作業時間' : '休憩時間';
    // プログレスバーを更新
    const totalTime = currentMode === 'work' ? WORK_TIME : BREAK_TIME;
    const elapsed = totalTime - timeRemaining;
    const progress = (elapsed / totalTime) * 100;
    progressBar.style.width = `${progress}%`;
    // トマトアイコンの位置を更新
    if (tomatoIcon) {
        tomatoIcon.style.left = `${progress}%`;
    }
    // モードに応じて色を変更
    if (currentMode === 'work') {
        progressBar.className = 'h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000 ease-linear';
    }
    else {
        progressBar.className = 'h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-1000 ease-linear';
    }
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
    // 作業時間を保存
    if (currentMode === 'work') {
        saveTodos();
    }
    // 通知音を鳴らす
    playNotificationSound();
    // モードを切り替え
    currentMode = currentMode === 'work' ? 'break' : 'work';
    timeRemaining = currentMode === 'work' ? WORK_TIME : BREAK_TIME;
    updateDisplay();
    // 表示を更新
    renderTodos();
    initSortable();
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
        // 作業モードの時、一番上のタスクの時間をカウントアップ
        if (currentMode === 'work' && todos.length > 0 && !todos[0].completed) {
            todos[0].workTime++;
            const timeElement = document.getElementById(`todo-time-${todos[0].id}`);
            if (timeElement) {
                timeElement.textContent = formatWorkTime(todos[0].workTime);
            }
        }
    }
    else {
        stopTimerInterval();
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
    startBtn.textContent = '一時停止';
    startBtn.className = 'px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5';
    resetBtn.disabled = true;
    // 表示を更新
    renderTodos();
    initSortable();
    timerInterval = window.setInterval(tick, 1000);
}
/**
 * Pause the timer
 */
function pauseTimer() {
    if (!isRunning)
        return;
    // 作業時間を保存
    if (currentMode === 'work') {
        saveTodos();
    }
    stopTimerInterval();
    startBtn.textContent = '再開';
    startBtn.className = 'px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5';
    resetBtn.disabled = false;
    // 表示を更新
    renderTodos();
    initSortable();
}
/**
 * Stop the timer interval
 */
function stopTimerInterval() {
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
    stopTimerInterval();
    currentMode = 'work';
    timeRemaining = WORK_TIME;
    updateDisplay();
    startBtn.textContent = 'スタート';
    startBtn.className = 'px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5';
    resetBtn.disabled = true;
    // 表示を更新
    renderTodos();
    initSortable();
}
// イベントリスナーの設定
startBtn.addEventListener('click', () => {
    if (isRunning) {
        pauseTimer();
    }
    else {
        startTimer();
    }
});
resetBtn.addEventListener('click', resetTimer);
addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});
// スペースキーで一時停止・再開
document.addEventListener('keydown', (e) => {
    // 入力フィールドにフォーカスがある場合は無視
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement) {
        return;
    }
    // スペースキーが押された場合
    if (e.key === ' ') {
        e.preventDefault(); // ページスクロールを防ぐ
        startBtn.click();
    }
});
/**
 * Toggle tomato icon visibility
 */
function toggleTomato() {
    if (tomatoToggle.checked) {
        tomatoIcon.style.display = '';
    }
    else {
        tomatoIcon.style.display = 'none';
    }
    localStorage.setItem('pomodoro-tomato', tomatoToggle.checked.toString());
}
/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    if (darkModeToggle.checked) {
        document.body.classList.add('dark-mode');
    }
    else {
        document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('pomodoro-darkmode', darkModeToggle.checked.toString());
}
/**
 * Load settings from localStorage
 */
function loadSettings() {
    // トマト表示設定を読み込み
    const tomatoSetting = localStorage.getItem('pomodoro-tomato');
    if (tomatoSetting !== null) {
        tomatoToggle.checked = tomatoSetting === 'true';
        toggleTomato();
    }
    // ダークモード設定を読み込み
    const darkModeSetting = localStorage.getItem('pomodoro-darkmode');
    if (darkModeSetting !== null) {
        darkModeToggle.checked = darkModeSetting === 'true';
        toggleDarkMode();
    }
}
// イベントリスナーを追加
tomatoToggle.addEventListener('change', toggleTomato);
darkModeToggle.addEventListener('change', toggleDarkMode);
// 初期化
loadSettings();
loadTodos();
renderTodos();
initSortable();
updateDisplay();
