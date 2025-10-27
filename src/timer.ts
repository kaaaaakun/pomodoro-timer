type TimerMode = 'work' | 'break';

type Todo = {
  id: string;
  text: string;
  workTime: number;
  createdAt: number;
};

// クエリパラメータから分数を取得（デバッグ用）
const params = new URLSearchParams(window.location.search);
const WORK_TIME = (parseInt(params.get('work') || '25', 10)) * 60;
const BREAK_TIME = (parseInt(params.get('break') || '5', 10)) * 60;

let currentMode: TimerMode = 'work';
let timeRemaining = WORK_TIME;
let timerInterval: number | null = null;
let isRunning = false;
let todos: Todo[] = [];
let currentTodoId: string | null = null;
let workStartTime: number | null = null;

const timeDisplay = document.getElementById('timeDisplay') as HTMLElement;
const modeLabel = document.getElementById('modeLabel') as HTMLElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const todoInput = document.getElementById('todoInput') as HTMLInputElement;
const addTodoBtn = document.getElementById('addTodoBtn') as HTMLButtonElement;
const todoList = document.getElementById('todoList') as HTMLElement;

/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format minutes to display format
 */
function formatMinutes(minutes: number): string {
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
function loadTodos(): void {
  const stored = localStorage.getItem('pomodoro-todos');
  if (stored) {
    todos = JSON.parse(stored);
  }
}

/**
 * Save todos to localStorage
 */
function saveTodos(): void {
  localStorage.setItem('pomodoro-todos', JSON.stringify(todos));
}

/**
 * Render todo list
 */
function renderTodos(): void {
  todoList.innerHTML = '';

  todos.forEach((todo, index) => {
    const todoItem = document.createElement('div');
    todoItem.className = 'todo-item';
    if (todo.id === currentTodoId) {
      todoItem.classList.add('active');
    }

    const todoContent = document.createElement('div');
    todoContent.className = 'todo-content';

    const todoText = document.createElement('div');
    todoText.className = 'todo-text';
    todoText.textContent = todo.text;

    const todoTime = document.createElement('div');
    todoTime.className = 'todo-time';
    todoTime.textContent = formatMinutes(todo.workTime);

    todoContent.appendChild(todoText);
    todoContent.appendChild(todoTime);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'todo-buttons';

    // 上へ移動ボタン
    if (index > 0) {
      const upBtn = document.createElement('button');
      upBtn.className = 'move-btn';
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
      downBtn.className = 'move-btn';
      downBtn.textContent = '↓';
      downBtn.onclick = (e) => {
        e.stopPropagation();
        moveTodoDown(index);
      };
      buttonGroup.appendChild(downBtn);
    }

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
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
function addTodo(): void {
  const text = todoInput.value.trim();
  if (!text) return;

  const todo: Todo = {
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
function deleteTodo(id: string): void {
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
function selectTodo(id: string): void {
  currentTodoId = id;
  renderTodos();
}

/**
 * Move todo up in the list
 */
function moveTodoUp(index: number): void {
  if (index <= 0) return;
  [todos[index - 1], todos[index]] = [todos[index], todos[index - 1]];
  saveTodos();
  renderTodos();
}

/**
 * Move todo down in the list
 */
function moveTodoDown(index: number): void {
  if (index >= todos.length - 1) return;
  [todos[index], todos[index + 1]] = [todos[index + 1], todos[index]];
  saveTodos();
  renderTodos();
}

/**
 * Update the timer display
 */
function updateDisplay(): void {
  timeDisplay.textContent = formatTime(timeRemaining);
  modeLabel.textContent = currentMode === 'work' ? '作業時間' : '休憩時間';
}

/**
 * Play notification sound using Web Audio API
 */
function playNotificationSound(): void {
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
function switchMode(): void {
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
function pauseTimer(): void {
  if (!isRunning) return;

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
