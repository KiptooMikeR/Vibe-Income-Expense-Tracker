(() => {
  // DOM elements
  const typeInput = document.getElementById('type');
  const amountInput = document.getElementById('amount');
  const descriptionInput = document.getElementById('description');
  const addTransactionBtn = document.getElementById('addTransactionBtn');
  const transactionList = document.getElementById('transactionList');
  const summary = document.getElementById('summary');
  const voiceInputBtn = document.getElementById('voiceInputBtn');
  const photoInput = document.getElementById('photoInput');

  // Local storage key
  const STORAGE_KEY = 'vibe-expense-tracker-transactions';

  // Transaction array
  let transactions = [];

  // Load transactions from localStorage
  function loadTransactions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    transactions = stored ? JSON.parse(stored) : [];
  }

  // Save transactions to localStorage
  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  // Format date human readable
  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  // Render transaction list
  function renderTransactions() {
    transactionList.innerHTML = '';
    transactions.forEach((tx, index) => {
      const item = document.createElement('div');
      item.className = `transaction-item ${tx.type}`;
      item.style.animationDelay = `${index * 100}ms`;
      const desc = document.createElement('div');
      desc.className = 'item-desc';
      desc.textContent = tx.description;
      const amount = document.createElement('div');
      amount.className = 'item-amount';
      amount.textContent = (tx.type === 'income' ? '+ ' : '- ') + '$' + tx.amount.toFixed(2);
      const date = document.createElement('div');
      date.className = 'item-date';
      date.textContent = formatDate(new Date(tx.date));
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = 'Delete transaction';
      deleteBtn.style.marginLeft = '1rem';
      deleteBtn.style.background = 'transparent';
      deleteBtn.style.border = 'none';
      deleteBtn.style.color = '#fff';
      deleteBtn.style.fontWeight = '700';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.setAttribute('aria-label', 'Delete transaction');
      deleteBtn.addEventListener('click', () => {
        transactions.splice(index,1);
        saveTransactions();
        renderTransactions();
        updateSummary();
      });

      item.appendChild(desc);
      item.appendChild(amount);
      item.appendChild(date);
      item.appendChild(deleteBtn);
      transactionList.appendChild(item);
    });
  }

  // Update the summary (total income, total expense, profit/loss)
  function updateSummary() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expense;
    summary.innerHTML = `
      Income: <strong style="color:#52d279;">$${income.toFixed(2)}</strong> &nbsp;&nbsp;
      Expense: <strong style="color:#ff7474;">$${expense.toFixed(2)}</strong> &nbsp;&nbsp;
      ${profit >= 0 ? `<span class="profit">Profit: $${profit.toFixed(2)}</span>` : `<span class="loss">Loss: $${profit.toFixed(2)}</span>`}
    `;
  }

  // Add transaction from inputs
  function addTransaction() {
    const type = typeInput.value;
    const amountVal = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim() || (type === 'income' ? 'Income' : 'Expense');
    if(isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid amount greater than zero.');
      return;
    }
    transactions.push({
      type,
      amount: amountVal,
      description,
      date: new Date().toISOString()
    });
    saveTransactions();
    renderTransactions();
    updateSummary();
    amountInput.value = '';
    descriptionInput.value = '';
    amountInput.focus();
  }

  // Voice input using SpeechRecognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  let listening = false;
  if(SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript.toLowerCase();
      parseVoiceCommand(speech);
      stopListening();
    };
    recognition.onerror = (event) => {
      alert('Voice recognition error: ' + event.error);
      stopListening();
    };
    recognition.onend = () => {
      if(listening) {
        stopListening();
      }
    };
  } else {
    voiceInputBtn.style.display = 'none';
  }

  function startListening() {
    if(!listening) {
      recognition.start();
      listening = true;
      voiceInputBtn.classList.add('listening');
      voiceInputBtn.textContent = '🎤 Listening... Click to stop';
    }
  }
  function stopListening() {
    if(listening) {
      recognition.stop();
      listening = false;
      voiceInputBtn.classList.remove('listening');
      voiceInputBtn.textContent = '🎤 Voice Input';
    }
  }

  voiceInputBtn.addEventListener('click', () => {
    if(listening) {
      stopListening();
    } else {
      startListening();
    }
  });

  // Parse speech command format: "Add expense 25 for snacks" OR "Add income 45 salary"
  function parseVoiceCommand(speech) {
    // Basic regex parsing for "add (income|expense) (amount) for? (description)"
    const regex = /add\s+(income|expense)\s+(\d+(\.\d{1,2})?)(?:\s+for\s+(.+))?/;
    const match = speech.match(regex);
    if(match) {
      const [, type, amountStr, , desc] = match;
      const amount = parseFloat(amountStr);
      const description = desc || (type === 'income' ? 'Income' : 'Expense');
      if(amount > 0) {
        transactions.push({
          type,
          amount,
          description,
          date: new Date().toISOString()
        });
        saveTransactions();
        renderTransactions();
        updateSummary();
        alert(`Added ${type} of $${amount.toFixed(2)}: ${description}`);
      } else {
        alert('Amount must be greater than zero.');
      }
    } else {
      alert('Sorry, could not parse your voice command. Try: "Add expense 20 for lunch" or "Add income 50 salary".');
    }
  }

  // Handle receipt photo upload (very basic: just capturing file name in description for demo)
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if(!file) return;
    // For simplicity, treat receipt photo as an expense with unknown amount
    const description = `Receipt Photo: ${file.name}`;
    const confirmed = confirm('Add an expense with description "' + description + '" and enter the amount next?');
    if(confirmed) {
      // Prompt amount user input (simple, could be enhanced with OCR API etc.)
      const amountStr = prompt("Enter amount for this receipt photo (in $):");
      if(amountStr) {
        const amountVal = parseFloat(amountStr);
        if(!isNaN(amountVal) && amountVal > 0) {
          transactions.push({
            type: 'expense',
            amount: amountVal,
            description,
            date: new Date().toISOString()
          });
          saveTransactions();
          renderTransactions();
          updateSummary();
          alert("Expense added from receipt photo!");
        } else {
          alert("Invalid amount. Receipt not added.");
        }
      } else {
        alert("No amount entered. Receipt not added.");
      }
    }
    photoInput.value = ''; // reset
  });

  // Button to add transaction event
  addTransactionBtn.addEventListener('click', addTransaction);

  // Initial load
  loadTransactions();
  renderTransactions();
  updateSummary();

})();