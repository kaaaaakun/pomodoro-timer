type TimerMode = 'work' | 'break';

type Todo = {
  id: string;
  text: string;
  workTime: number;
  completed: boolean;
  createdAt: number;
};

// SortableJS型定義
declare const Sortable: any;

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

const timeDisplay = document.getElementById('timeDisplay') as HTMLElement;
const modeLabel = document.getElementById('modeLabel') as HTMLElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const todoInput = document.getElementById('todoInput') as HTMLInputElement;
const addTodoBtn = document.getElementById('addTodoBtn') as HTMLButtonElement;
const todoList = document.getElementById('todoList') as HTMLElement;
const workTimeInfo = document.getElementById('workTimeInfo') as HTMLElement;
const breakTimeInfo = document.getElementById('breakTimeInfo') as HTMLElement;
const soundToggle = document.getElementById('soundToggle') as HTMLInputElement;

/**
 * Format seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to display format with hours and minutes
 */
function formatWorkTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分`;
  } else {
    return `0分`;
  }
}

/**
 * Load todos from localStorage
 */
function loadTodos(): void {
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
function saveTodos(): void {
  localStorage.setItem('pomodoro-todos', JSON.stringify(todos));
}

/**
 * Render todo list
 */
function renderTodos(): void {
  todoList.innerHTML = '';

  todos.forEach((todo, index) => {
    const isCurrentTask = index === 0 && !todo.completed && isRunning && currentMode === 'work';
    const todoItem = document.createElement('div');
    todoItem.className = `flex items-center gap-3 p-4 rounded-xl transition-all duration-200 border-2 ${
      isCurrentTask
        ? 'border-green-500 bg-green-50 shadow-lg'
        : todo.id === currentTodoId
        ? 'border-indigo-500 bg-indigo-50'
        : 'border-transparent hover:bg-gray-100 bg-gray-50'
    } ${todo.completed ? 'opacity-60' : ''}`;
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
    todoText.className = `flex-1 break-words ${
      todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
    }`;
    todoText.textContent = todo.text;

    const todoTime = document.createElement('div');
    todoTime.className = 'ml-4 text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg whitespace-nowrap';
    todoTime.id = `todo-time-${todo.id}`;
    todoTime.textContent = formatWorkTime(todo.workTime);

    todoContent.appendChild(todoText);
    todoContent.appendChild(todoTime);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'flex gap-2 items-center flex-shrink-0';

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all hover:scale-110 text-xl';
    deleteBtn.textContent = '×';
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
function addTodo(): void {
  const text = todoInput.value.trim();
  if (!text) return;

  const todo: Todo = {
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
function deleteTodo(id: string): void {
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
function selectTodo(id: string): void {
  currentTodoId = id;
  renderTodos();
  initSortable();
}

/**
 * Toggle todo completion status
 */
function toggleComplete(id: string): void {
  const todoIndex = todos.findIndex((t) => t.id === id);
  if (todoIndex === -1) return;

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
function initSortable(): void {
  if (typeof Sortable === 'undefined') return;

  new Sortable(todoList, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    // モバイル対応の設定
    forceFallback: true,
    fallbackClass: 'sortable-fallback',
    delayOnTouchOnly: true,
    delay: 150,
    touchStartThreshold: 10,
    onEnd: (evt: any) => {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;

      if (oldIndex !== undefined && newIndex !== undefined) {
        const movedTodo = todos.splice(oldIndex, 1)[0];
        todos.splice(newIndex, 0, movedTodo);
        saveTodos();
      }
    },
  });
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
  // 音がオフの場合は何もしない
  if (!soundToggle.checked) return;

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
function tick(): void {
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
  } else {
    stopTimerInterval();
    switchMode();
  }
}

/**
 * Start the timer
 */
function startTimer(): void {
  if (isRunning) return;

  isRunning = true;
  startBtn.textContent = '一時停止';
  resetBtn.disabled = true;

  // 表示を更新
  renderTodos();
  initSortable();

  timerInterval = window.setInterval(tick, 1000);
}

/**
 * Pause the timer
 */
function pauseTimer(): void {
  if (!isRunning) return;

  // 作業時間を保存
  if (currentMode === 'work') {
    saveTodos();
  }

  stopTimerInterval();
  startBtn.textContent = '再開';
  resetBtn.disabled = false;

  // 表示を更新
  renderTodos();
  initSortable();
}

/**
 * Stop the timer interval
 */
function stopTimerInterval(): void {
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
  stopTimerInterval();
  currentMode = 'work';
  timeRemaining = WORK_TIME;
  updateDisplay();

  startBtn.textContent = 'スタート';
  resetBtn.disabled = true;

  // 表示を更新
  renderTodos();
  initSortable();
}

// イベントリスナーの設定
startBtn.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
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
  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    return;
  }

  // スペースキーが押された場合
  if (e.key === ' ') {
    e.preventDefault(); // ページスクロールを防ぐ
    startBtn.click();
  }
});

// 初期化
loadTodos();
renderTodos();
initSortable();
updateDisplay();

// 設定時間を表示
workTimeInfo.textContent = (WORK_TIME / 60).toString();
breakTimeInfo.textContent = (BREAK_TIME / 60).toString();
