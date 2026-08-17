const input = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('todo-list');
const clearBtn = document.getElementById('clear-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortBtns = document.querySelectorAll('.sort-btn');
const prioritySelect = document.getElementById('priority-select');
const searchInput = document.getElementById('search-input');
const themeToggle = document.getElementById('theme-toggle');
const totalCountEl = document.getElementById('total-count');
const doneCountEl = document.getElementById('done-count');
const urgentCountEl = document.getElementById('urgent-count');

let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let currentSort = 'newest';
let searchTerm = '';
let draggedElement = null;

// 初始化
initialize();

function initialize() {
  // 恢復主題設置
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
  
  renderTodos();
  updateStats();
  addEventListeners();
}

function addEventListeners() {
  addBtn.addEventListener('click', addTodo);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.ctrlKey) addTodo();
  });
  
  // Ctrl+Enter 快捷鍵
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      addTodo();
    }
  });
  
  clearBtn.addEventListener('click', clearCompletedTodos);
  deleteAllBtn.addEventListener('click', deleteAllTodos);
  exportBtn.addEventListener('click', exportTodos);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImportFile);
  
  themeToggle.addEventListener('click', toggleTheme);
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderTodos();
    });
  });
  
  sortBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      sortBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentSort = e.target.dataset.sort;
      renderTodos();
    });
  });
  
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderTodos();
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
}

function addTodo() {
  const text = input.value.trim();
  if (text === '') return;
  
  const todo = {
    id: Date.now(),
    text,
    done: false,
    priority: prioritySelect.value,
    createdAt: new Date().getTime(),
    dueDate: null
  };
  
  todos.unshift(todo);
  saveTodos();
  renderTodos();
  updateStats();
  input.value = '';
  input.focus();
  prioritySelect.value = 'normal';
}

function renderTodos() {
  list.innerHTML = '';
  
  let filteredTodos = getFilteredTodos();
  filteredTodos = getSortedTodos(filteredTodos);
  
  if (filteredTodos.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = '<p>✨ 暫無待辦事項</p>';
    list.appendChild(emptyState);
    return;
  }
  
  filteredTodos.forEach((todo) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.id = todo.id;
    li.className = `priority-${todo.priority} ${todo.done ? 'done' : ''}`;
    
    const badgeHtml = `
      ${todo.priority === 'urgent' ? '<span class="todo-badge badge-urgent">🔥 緊急</span>' : ''}
      ${todo.priority === 'high' ? '<span class="todo-badge badge-high">⚡ 比較急</span>' : ''}
    `;
    
    li.innerHTML = `
      <div class="todo-header">
        <div class="todo-content">
          <div class="todo-text ${todo.done ? 'done' : ''}">${escapeHtml(todo.text)}</div>
          <div class="todo-meta">
            ${badgeHtml}
            <span style="font-size: 11px; color: #999;">${formatDate(todo.createdAt)}</span>
          </div>
        </div>
      </div>
      <div class="todo-actions">
        <button class="todo-btn todo-btn-complete">${todo.done ? '↩️ 取消' : '✓ 完成'}</button>
        <button class="todo-btn todo-btn-delete">🗑️ 刪除</button>
      </div>
    `;
    
    const completeBtn = li.querySelector('.todo-btn-complete');
    const deleteBtn = li.querySelector('.todo-btn-delete');
    
    completeBtn.addEventListener('click', () => toggleTodo(todo.id));
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
    
    // 拖拽事件
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragend', handleDragEnd);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);
    
    list.appendChild(li);
  });
}

function getFilteredTodos() {
  let filtered = todos;
  
  // 應用篩選器
  if (currentFilter === 'all') {
    filtered = todos;
  } else if (currentFilter === 'done') {
    filtered = todos.filter(t => t.done);
  } else if (currentFilter === 'pending') {
    filtered = todos.filter(t => !t.done);
  } else if (currentFilter === 'urgent') {
    filtered = todos.filter(t => t.priority === 'urgent');
  }
  
  // 應用搜尋
  if (searchTerm) {
    filtered = filtered.filter(t => t.text.toLowerCase().includes(searchTerm));
  }
  
  return filtered;
}

function getSortedTodos(todos) {
  const sorted = [...todos];
  
  if (currentSort === 'newest') {
    return sorted.sort((a, b) => b.createdAt - a.createdAt);
  } else if (currentSort === 'priority') {
    const priorityOrder = { urgent: 0, high: 1, normal: 2 };
    return sorted.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.createdAt - a.createdAt;
    });
  } else if (currentSort === 'alpha') {
    return sorted.sort((a, b) => a.text.localeCompare(b.text));
  }
  
  return sorted;
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    saveTodos();
    renderTodos();
    updateStats();
  }
}

function deleteTodo(id) {
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (!li) return;
  
  if (confirm('確定要刪除這個待辦事項嗎？')) {
    li.classList.add('fade-out');
    setTimeout(() => {
      todos = todos.filter(t => t.id !== id);
      saveTodos();
      renderTodos();
      updateStats();
    }, 300);
  }
}

function clearCompletedTodos() {
  if (todos.some(t => t.done)) {
    if (confirm('確定要清空所有已完成的待辦事項嗎？')) {
      todos = todos.filter(t => !t.done);
      saveTodos();
      renderTodos();
      updateStats();
    }
  }
}

function deleteAllTodos() {
  if (todos.length === 0) return;
  
  if (confirm('確定要清空所有待辦事項嗎？此操作無法復原！')) {
    todos = [];
    saveTodos();
    renderTodos();
    updateStats();
  }
}

function exportTodos() {
  if (todos.length === 0) {
    alert('沒有待辦事項可導出');
    return;
  }
  
  const dataStr = JSON.stringify(todos, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `todos_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      
      // 驗證導入的數據格式
      if (!Array.isArray(importedData)) {
        throw new Error('無效的檔案格式：必須是陣列');
      }
      
      if (importedData.length === 0) {
        alert('檔案中沒有待辦事項');
        importFile.value = '';
        return;
      }
      
      // 驗證每個項目的結構
      const isValidStructure = importedData.every(item => 
        typeof item === 'object' && 
        item.text !== undefined
      );
      
      if (!isValidStructure) {
        throw new Error('檔案格式不正確');
      }
      
      // 提示用戶選擇合併或覆蓋
      const shouldMerge = confirm(
        `已選擇 ${importedData.length} 個待辦事項\n\n` +
        '點擊「確定」合併到現有項目\n' +
        '點擊「取消」覆蓋現有項目'
      );
      
      if (shouldMerge) {
        // 合併模式：避免重複ID
        const existingIds = new Set(todos.map(t => t.id));
        const newTodos = importedData.filter(item => {
          if (!item.id || existingIds.has(item.id)) {
            item.id = Date.now() + Math.random();
          }
          return true;
        });
        todos = [...todos, ...newTodos];
      } else {
        // 覆蓋模式：重新生成ID確保唯一性
        todos = importedData.map((item, index) => ({
          ...item,
          id: Date.now() + index
        }));
      }
      
      saveTodos();
      renderTodos();
      updateStats();
      alert(`✅ 已成功導入 ${(shouldMerge ? importedData : todos).length} 個待辦事項！`);
      
    } catch (error) {
      alert(`❌ 導入失敗：${error.message}\n\n請確保您選擇的是由本應用導出的 JSON 檔案`);
      console.error('Import error:', error);
    } finally {
      importFile.value = '';
    }
  };
  
  reader.onerror = () => {
    alert('❌ 讀取檔案失敗');
    importFile.value = '';
  };
  
  reader.readAsText(file);
}

function updateStats() {
  totalCountEl.textContent = todos.length;
  doneCountEl.textContent = todos.filter(t => t.done).length;
  urgentCountEl.textContent = todos.filter(t => t.priority === 'urgent').length;
}

function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `今天 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-TW');
  }
}

// 拖拽排序功能
function handleDragStart(e) {
  draggedElement = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  this.style.opacity = '0.5';
}

function handleDragEnd(e) {
  if (draggedElement) {
    draggedElement.style.opacity = '1';
    draggedElement.style.borderTop = 'none';
  }
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement && !this.classList.contains('empty-state')) {
    this.style.borderTop = '3px solid #667eea';
  }
}

function handleDragLeave(e) {
  if (this === e.target || this.contains(e.target)) {
    this.style.borderTop = 'none';
  }
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  this.style.borderTop = 'none';
  
  if (this !== draggedElement && draggedElement) {
    const draggedId = parseInt(draggedElement.dataset.id);
    const targetId = parseInt(this.dataset.id);
    
    const draggedIndex = todos.findIndex(t => t.id === draggedId);
    const targetIndex = todos.findIndex(t => t.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = todos.splice(draggedIndex, 1);
      todos.splice(targetIndex, 0, removed);
      saveTodos();
      renderTodos();
    }
  }
  return false;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
