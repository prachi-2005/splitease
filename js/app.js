/* ================================================================
   SplitEase — Vanilla JS App Logic
   LocalStorage-backed Splitwise clone
   ================================================================ */

// ──────────────────────────── HELPERS ────────────────────────────
const LS = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); }
};

function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

function formatCurrency(n) {
  const abs = Math.abs(n);
  return (n < 0 ? '-' : '') + '₹' + abs.toFixed(2);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function dateLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ──────────────────────────── INIT DATA ────────────────────────────
function initData() {
  if (!LS.get('users')) LS.set('users', []);
  if (!LS.get('groups')) LS.set('groups', []);
  if (!LS.get('expenses')) LS.set('expenses', []);
}
initData();

// ──────────────────────────── AUTH ────────────────────────────
function switchAuthTab(tab) {
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
  document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
  document.getElementById('signupTabBtn').classList.toggle('active', tab === 'signup');
  document.getElementById('loginError').textContent = '';
  document.getElementById('signupError').textContent = '';
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;

  const users = LS.get('users') || [];
  if (users.find(u => u.email === email)) {
    document.getElementById('signupError').textContent = 'An account with this email already exists.';
    return;
  }

  const newUser = { id: uuid(), name, email, password };
  users.push(newUser);
  LS.set('users', users);
  LS.set('currentUser', newUser);
  showToast('Account created!', 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 500);
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const users = LS.get('users') || [];
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    document.getElementById('loginError').textContent = 'Invalid email or password.';
    return;
  }

  LS.set('currentUser', user);
  showToast('Welcome back!', 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 500);
}

function handleLogout() {
  LS.remove('currentUser');
  window.location.href = 'index.html';
}

// redirect guard
function requireAuth() {
  const user = LS.get('currentUser');
  if (!user) { window.location.href = 'index.html'; return null; }
  return user;
}

// ──────────────────────────── SIDEBAR / NAV ────────────────────────────
let currentView = 'dashboard';
let currentGroupId = null;

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function showView(view, groupId) {
  currentView = view;
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (view === 'dashboard') {
    document.getElementById('viewDashboard').classList.add('active');
    document.getElementById('navDashboard').classList.add('active');
    renderDashboard();
  } else if (view === 'groups') {
    document.getElementById('viewGroups').classList.add('active');
    document.getElementById('navGroups').classList.add('active');
    renderGroups();
  } else if (view === 'groupDetail') {
    document.getElementById('viewGroupDetail').classList.add('active');
    document.getElementById('navGroups').classList.add('active');
    currentGroupId = groupId;
    renderGroupDetail(groupId);
  } else if (view === 'settlements') {
    document.getElementById('viewSettlements').classList.add('active');
    document.getElementById('navSettlements').classList.add('active');
    renderSettlements();
  }

  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ──────────────────────────── MODAL ────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ──────────────────────────── CREATE GROUP ────────────────────────────
let tempMembers = [];

function addMemberChip() {
  const input = document.getElementById('memberNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (tempMembers.includes(name)) { showToast('Member already added', 'error'); return; }
  tempMembers.push(name);
  input.value = '';
  renderMemberChips();
}

// Allow pressing Enter in member input
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'memberNameInput' && e.key === 'Enter') {
    e.preventDefault();
    addMemberChip();
  }
});

function removeMemberChip(idx) {
  tempMembers.splice(idx, 1);
  renderMemberChips();
}

function renderMemberChips() {
  const container = document.getElementById('memberChips');
  if (!container) return;
  container.innerHTML = tempMembers.map((m, i) =>
    `<span class="chip">${m} <span class="chip-remove" onclick="removeMemberChip(${i})">✕</span></span>`
  ).join('');
}

function handleCreateGroup(e) {
  e.preventDefault();
  const user = LS.get('currentUser');
  const name = document.getElementById('groupNameInput').value.trim();
  if (!name) return;

  // always include logged-in user
  const members = [user.name, ...tempMembers.filter(m => m !== user.name)];
  if (members.length < 2) { showToast('Add at least one other member', 'error'); return; }

  const groups = LS.get('groups') || [];
  const newGroup = { id: uuid(), name, members, createdBy: user.id, createdAt: new Date().toISOString() };
  groups.push(newGroup);
  LS.set('groups', groups);

  // reset
  tempMembers = [];
  document.getElementById('groupNameInput').value = '';
  renderMemberChips();
  closeModal('createGroupModal');
  showToast('Group created!', 'success');
  showView('groups');
  renderSidebar();
}

// ──────────────────────────── ADD EXPENSE ────────────────────────────
function openAddExpenseModal() {
  const groups = LS.get('groups') || [];
  const group = groups.find(g => g.id === currentGroupId);
  if (!group) return;

  // populate paid-by dropdown
  const paidSelect = document.getElementById('expensePaidBy');
  paidSelect.innerHTML = group.members.map(m => `<option value="${m}">${m}</option>`).join('');

  // populate split checkboxes
  const splitContainer = document.getElementById('splitMembersList');
  splitContainer.innerHTML = group.members.map(m =>
    `<label class="split-member-row">
      <input type="checkbox" value="${m}" checked />
      <span>${m}</span>
      <span class="split-share"></span>
    </label>`
  ).join('');

  // recalculate share display on checkbox change
  splitContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateSplitShares);
  });

  document.getElementById('expenseDesc').value = '';
  document.getElementById('expenseAmount').value = '';

  openModal('addExpenseModal');
  updateSplitShares();
}

function updateSplitShares() {
  const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
  const checked = document.querySelectorAll('#splitMembersList input[type="checkbox"]:checked');
  const share = checked.length > 0 ? amount / checked.length : 0;
  document.querySelectorAll('#splitMembersList .split-share').forEach(el => el.textContent = '');
  checked.forEach(cb => {
    const row = cb.closest('.split-member-row');
    row.querySelector('.split-share').textContent = formatCurrency(share);
  });
}

// refresh shares when amount changes
document.addEventListener('input', (e) => {
  if (e.target.id === 'expenseAmount') updateSplitShares();
});

function handleAddExpense(e) {
  e.preventDefault();
  const desc = document.getElementById('expenseDesc').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const paidBy = document.getElementById('expensePaidBy').value;
  const checked = Array.from(document.querySelectorAll('#splitMembersList input[type="checkbox"]:checked')).map(cb => cb.value);

  if (!desc || !amount || amount <= 0) { showToast('Fill in all fields', 'error'); return; }
  if (checked.length === 0) { showToast('Select at least one member to split', 'error'); return; }

  const expenses = LS.get('expenses') || [];
  expenses.push({
    id: uuid(),
    groupId: currentGroupId,
    description: desc,
    amount,
    paidBy,
    splitAmong: checked,
    date: new Date().toISOString()
  });
  LS.set('expenses', expenses);

  closeModal('addExpenseModal');
  showToast('Expense added!', 'success');
  renderGroupDetail(currentGroupId);
  renderDashboard();
}

// ──────────────────────────── BALANCE CALCULATION ────────────────────────────
function calcGroupBalances(groupId) {
  const expenses = (LS.get('expenses') || []).filter(ex => ex.groupId === groupId);
  const balances = {}; // balances[A][B] = amount A owes B

  expenses.forEach(ex => {
    const share = ex.amount / ex.splitAmong.length;
    ex.splitAmong.forEach(member => {
      if (member !== ex.paidBy) {
        if (!balances[member]) balances[member] = {};
        if (!balances[member][ex.paidBy]) balances[member][ex.paidBy] = 0;
        balances[member][ex.paidBy] += share;
      }
    });
  });

  // simplify: net out A→B vs B→A
  const debts = [];
  const processed = new Set();
  for (const debtor in balances) {
    for (const creditor in balances[debtor]) {
      const key = [debtor, creditor].sort().join('|');
      if (processed.has(key)) continue;
      processed.add(key);

      const aToB = (balances[debtor] && balances[debtor][creditor]) || 0;
      const bToA = (balances[creditor] && balances[creditor][debtor]) || 0;
      const net = aToB - bToA;
      if (Math.abs(net) > 0.01) {
        if (net > 0) debts.push({ from: debtor, to: creditor, amount: net });
        else debts.push({ from: creditor, to: debtor, amount: -net });
      }
    }
  }
  return debts;
}

function calcUserTotals() {
  const user = LS.get('currentUser');
  if (!user) return { owe: 0, owed: 0 };
  const groups = LS.get('groups') || [];
  let owe = 0, owed = 0;

  groups.forEach(g => {
    const debts = calcGroupBalances(g.id);
    debts.forEach(d => {
      if (d.from === user.name) owe += d.amount;
      if (d.to === user.name) owed += d.amount;
    });
  });

  return { owe, owed };
}

// ──────────────────────────── RENDER: DASHBOARD ────────────────────────────
function renderDashboard() {
  const { owe, owed } = calcUserTotals();
  const balance = owed - owe;

  const totalEl = document.getElementById('totalBalance');
  totalEl.textContent = formatCurrency(balance);
  totalEl.className = 'balance-amount ' + (balance >= 0 ? 'balance-positive' : 'balance-negative');

  document.getElementById('youOwe').textContent = formatCurrency(owe);
  document.getElementById('youAreOwed').textContent = formatCurrency(owed);

  // Recent expenses (last 10 across all groups)
  const expenses = (LS.get('expenses') || []).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  const groups = LS.get('groups') || [];
  const container = document.getElementById('recentExpenses');

  if (expenses.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>No expenses yet. Create a group and add your first expense!</p></div>`;
    return;
  }

  container.innerHTML = expenses.map(ex => {
    const group = groups.find(g => g.id === ex.groupId);
    const groupName = group ? group.name : 'Unknown';
    return `
      <div class="expense-item">
        <div class="expense-icon">🧾</div>
        <div class="expense-info">
          <div class="expense-desc">${ex.description}</div>
          <div class="expense-meta">${groupName} · paid by ${ex.paidBy}</div>
        </div>
        <div>
          <div class="expense-amount">${formatCurrency(ex.amount)}</div>
          <div class="expense-date">${dateLabel(ex.date)}</div>
        </div>
      </div>`;
  }).join('');
}

// ──────────────────────────── RENDER: GROUPS ────────────────────────────
function renderGroups() {
  const groups = LS.get('groups') || [];
  const container = document.getElementById('groupGrid');

  if (groups.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No groups yet. Create one to start splitting expenses!</p></div>`;
    return;
  }

  container.innerHTML = groups.map(g => {
    const debts = calcGroupBalances(g.id);
    const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
    return `
      <div class="group-card glass float-card" onclick="showView('groupDetail','${g.id}')">
        <div class="group-name">${g.name}</div>
        <div class="group-members-count">${g.members.length} members</div>
        <div class="group-balance-summary ${totalDebt > 0 ? 'text-negative' : 'text-positive'}">
          ${totalDebt > 0 ? formatCurrency(totalDebt) + ' unsettled' : 'All settled ✓'}
        </div>
      </div>`;
  }).join('');
}

function renderSidebar() {
  const groups = LS.get('groups') || [];
  const user = LS.get('currentUser');
  const countEl = document.getElementById('groupCount');
  const listEl = document.getElementById('sidebarGroupList');
  const userEl = document.getElementById('sidebarUser');

  if (countEl) countEl.textContent = groups.length;
  if (userEl && user) userEl.textContent = user.name;

  if (listEl) {
    listEl.innerHTML = groups.map(g =>
      `<div class="nav-item" onclick="showView('groupDetail','${g.id}')">
        <span class="nav-icon">📁</span> ${g.name}
      </div>`
    ).join('');
  }
}

// ──────────────────────────── RENDER: GROUP DETAIL ────────────────────────────
function switchDetailTab(tab) {
  document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('active'));
  if (tab === 'expenses') {
    document.querySelector('.detail-tab:nth-child(1)').classList.add('active');
    document.getElementById('detailExpenses').classList.add('active');
  } else {
    document.querySelector('.detail-tab:nth-child(2)').classList.add('active');
    document.getElementById('detailBalances').classList.add('active');
  }
}

function renderGroupDetail(groupId) {
  const groups = LS.get('groups') || [];
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  document.getElementById('groupDetailName').textContent = group.name;
  document.getElementById('groupDetailMembers').innerHTML = group.members.map(m =>
    `<div class="member-tag">${m}</div>`
  ).join('');

  // Expenses
  const expenses = (LS.get('expenses') || []).filter(ex => ex.groupId === groupId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const expContainer = document.getElementById('groupExpenseList');
  if (expenses.length === 0) {
    expContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>No expenses in this group yet.</p></div>`;
  } else {
    expContainer.innerHTML = expenses.map(ex => `
      <div class="expense-item">
        <div class="expense-icon">🧾</div>
        <div class="expense-info">
          <div class="expense-desc">${ex.description}</div>
          <div class="expense-meta">paid by ${ex.paidBy} · split ${ex.splitAmong.length} ways</div>
        </div>
        <div>
          <div class="expense-amount">${formatCurrency(ex.amount)}</div>
          <div class="expense-date">${dateLabel(ex.date)}</div>
        </div>
      </div>`).join('');
  }

  // Balances
  const debts = calcGroupBalances(groupId);
  const balContainer = document.getElementById('groupBalanceList');
  if (debts.length === 0) {
    balContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>All settled up in this group!</p></div>`;
  } else {
    balContainer.innerHTML = debts.map(d => `
      <div class="settlement-item">
        <div class="expense-icon">💸</div>
        <div class="settlement-info"><strong>${d.from}</strong> owes <strong>${d.to}</strong></div>
        <div class="settlement-amount">${formatCurrency(d.amount)}</div>
        <button class="btn btn-positive btn-sm" onclick="settleDebt('${groupId}','${d.from}','${d.to}')">Settle</button>
      </div>`).join('');
  }
}

// ──────────────────────────── RENDER: SETTLEMENTS ────────────────────────────
function renderSettlements() {
  const groups = LS.get('groups') || [];
  const container = document.getElementById('globalSettlementList');
  let allDebts = [];

  groups.forEach(g => {
    const debts = calcGroupBalances(g.id);
    debts.forEach(d => allDebts.push({ ...d, groupId: g.id, groupName: g.name }));
  });

  if (allDebts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>All settled up! No outstanding balances.</p></div>`;
    return;
  }

  container.innerHTML = allDebts.map(d => `
    <div class="settlement-item">
      <div class="expense-icon">💸</div>
      <div class="settlement-info">
        <strong>${d.from}</strong> owes <strong>${d.to}</strong>
        <div class="expense-meta">${d.groupName}</div>
      </div>
      <div class="settlement-amount">${formatCurrency(d.amount)}</div>
      <button class="btn btn-positive btn-sm" onclick="settleDebt('${d.groupId}','${d.from}','${d.to}')">Settle</button>
    </div>`).join('');
}

// ──────────────────────────── SETTLE ────────────────────────────
function settleDebt(groupId, from, to) {
  // Remove all expenses related to this pair in this group by adding a reverse expense
  const debts = calcGroupBalances(groupId);
  const debt = debts.find(d => d.from === from && d.to === to);
  if (!debt) return;

  // Add a settlement expense (to is paying, from receives — effectively clears the balance)
  const expenses = LS.get('expenses') || [];
  expenses.push({
    id: uuid(),
    groupId,
    description: `Settlement: ${from} → ${to}`,
    amount: debt.amount,
    paidBy: from,
    splitAmong: [from],
    date: new Date().toISOString()
  });
  LS.set('expenses', expenses);
  showToast(`${from} settled with ${to}!`, 'success');

  // re-render current view
  if (currentView === 'groupDetail') renderGroupDetail(groupId);
  if (currentView === 'settlements') renderSettlements();
  renderDashboard();
  renderSidebar();
}

function settleAll() {
  const groups = LS.get('groups') || [];
  let settled = 0;

  groups.forEach(g => {
    const debts = calcGroupBalances(g.id);
    const expenses = LS.get('expenses') || [];
    debts.forEach(d => {
      expenses.push({
        id: uuid(),
        groupId: g.id,
        description: `Settlement: ${d.from} → ${d.to}`,
        amount: d.amount,
        paidBy: d.from,
        splitAmong: [d.from],
        date: new Date().toISOString()
      });
      settled++;
    });
    LS.set('expenses', expenses);
  });

  if (settled === 0) {
    showToast('Nothing to settle!', 'info');
  } else {
    showToast(`${settled} balance(s) settled!`, 'success');
  }
  renderSettlements();
  renderDashboard();
  renderSidebar();
}

// ──────────────────────────── PAGE INIT ────────────────────────────
(function init() {
  const isDashboard = window.location.pathname.includes('dashboard');
  if (isDashboard) {
    const user = requireAuth();
    if (!user) return;
    renderSidebar();
    renderDashboard();
  } else {
    // auth page: if already logged in, redirect
    if (LS.get('currentUser')) {
      window.location.href = 'dashboard.html';
    }
  }
})();
