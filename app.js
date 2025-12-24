// TapFI - Financial Independence Tracker
// All data stored in localStorage

class FITracker {
    constructor() {
        this.accounts = [];
        this.fiTarget = 1000000;
        this.withdrawalRate = 4;
        this.annualExpenses = 40000;
        
        // Projections defaults
        this.monthlyContribution = 2000;
        this.annualReturn = 7;
        this.currentAge = 30;
        this.retirementAge = 65;
        this.projectionYears = null; // null means auto-calculate

        this.history = []; // Historical Net Worth snapshots

        this.chart = null;
        this.projectionChart = null;
        this.historyChart = null;
        
        this.loadData();
        this.initializeEventListeners();
        this.updateDashboard();
    }

    // ===== Data Persistence =====
    loadData() {
        const savedData = localStorage.getItem('tapfi_data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.accounts = data.accounts || [];
                this.fiTarget = data.fiTarget || 1000000;
                this.withdrawalRate = data.withdrawalRate || 4;
                this.annualExpenses = data.annualExpenses || 40000;
                this.history = data.history || [];
                
                // Load Projections
                this.monthlyContribution = data.monthlyContribution !== undefined ? data.monthlyContribution : 2000;
                this.annualReturn = data.annualReturn !== undefined ? data.annualReturn : 7;
                this.currentAge = data.currentAge !== undefined ? data.currentAge : 30;
                this.retirementAge = data.retirementAge !== undefined ? data.retirementAge : 65;
                this.projectionYears = data.projectionYears !== undefined ? data.projectionYears : null;

                // Populate config inputs
                document.getElementById('fiTarget').value = this.formatInputCurrency(this.fiTarget);
                document.getElementById('withdrawalRate').value = this.withdrawalRate;
                document.getElementById('annualExpenses').value = this.formatInputCurrency(this.annualExpenses);
                
                // Populate projection inputs
                const mcInput = document.getElementById('monthlyContribution');
                if (mcInput) {
                    mcInput.value = this.formatInputCurrency(this.monthlyContribution);
                    document.getElementById('annualReturn').value = this.annualReturn;
                    document.getElementById('currentAge').value = this.currentAge;
                    document.getElementById('retirementAge').value = this.retirementAge;
                    if (this.projectionYears !== null) {
                        document.getElementById('projectionYears').value = this.projectionYears;
                    }
                }
            } catch (e) {
                console.error('Error loading data:', e);
            }
        }
    }

    saveData() {
        const data = {
            accounts: this.accounts,
            fiTarget: this.fiTarget,
            withdrawalRate: this.withdrawalRate,
            annualExpenses: this.annualExpenses,
            history: this.history,
            
            // Save Projections
            monthlyContribution: this.monthlyContribution,
            annualReturn: this.annualReturn,
            currentAge: this.currentAge,
            retirementAge: this.retirementAge,
            projectionYears: this.projectionYears,

            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('tapfi_data', JSON.stringify(data));
    }

    // ===== Event Listeners =====
    initializeEventListeners() {
        // Currency Input Formatting
        document.querySelectorAll('input[data-type="currency"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleCurrencyInput(e.target);
            });
            // Keep blur to ensure clean formatting (e.g. remove trailing dots)
            input.addEventListener('blur', (e) => {
                const val = this.parseInputCurrency(e.target.value);
                e.target.value = this.formatInputCurrency(val);
            });
        });

        // FI Config
        document.getElementById('saveConfig').addEventListener('click', () => this.saveFIConfig());
        
        // Auto-calculate Target from Expenses
        document.getElementById('annualExpenses').addEventListener('input', (e) => {
            const expenses = this.parseInputCurrency(e.target.value);
            const rate = parseFloat(document.getElementById('withdrawalRate').value);
            if (expenses && rate) {
                const target = expenses / (rate / 100);
                // Only update if not focused to avoid fighting the user
                const targetInput = document.getElementById('fiTarget');
                if (document.activeElement !== targetInput) {
                    targetInput.value = this.formatInputCurrency(Math.round(target));
                }
            }
        });

        // Auto-calculate Target from Rate (if Expenses exist)
        document.getElementById('withdrawalRate').addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            const expenses = this.parseInputCurrency(document.getElementById('annualExpenses').value);
            if (expenses && rate) {
                const target = expenses / (rate / 100);
                document.getElementById('fiTarget').value = this.formatInputCurrency(Math.round(target));
            }
        });

        // Auto-calculate Expenses from Target (Reverse calculation)
        document.getElementById('fiTarget').addEventListener('input', (e) => {
            const target = this.parseInputCurrency(e.target.value);
            const rate = parseFloat(document.getElementById('withdrawalRate').value);
            if (target && rate) {
                const expenses = target * (rate / 100);
                // Only update if not focused
                const expensesInput = document.getElementById('annualExpenses');
                if (document.activeElement !== expensesInput) {
                    expensesInput.value = this.formatInputCurrency(Math.round(expenses));
                }
            }
        });

        // Projections Inputs
        ['monthlyContribution', 'annualReturn', 'currentAge', 'retirementAge', 'projectionYears'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    // Handle currency inputs specially
                    if (el.dataset.type === 'currency') {
                        this[id] = this.parseInputCurrency(el.value);
                    } else {
                        // For projectionYears, allow empty value (null)
                        if (id === 'projectionYears') {
                            const val = el.value.trim();
                            this[id] = val === '' ? null : (parseFloat(val) || null);
                        } else {
                            this[id] = parseFloat(el.value) || 0;
                        }
                    }
                    this.saveData();
                    this.updateDashboard(); // Real-time updates
                });
                
                // For currency inputs, also update on blur to format
                if (el.dataset.type === 'currency') {
                    el.addEventListener('blur', () => {
                        el.value = this.formatInputCurrency(this[id]);
                    });
                }
            }
        });

        // Collapsible Cards
        document.querySelectorAll('.card.collapsible .card-header').forEach(header => {
            header.addEventListener('click', () => {
                const card = header.parentElement;
                card.classList.toggle('collapsed');
            });
        });

        // Manual Account
        document.getElementById('addManualAccount').addEventListener('click', () => this.addManualAccount());

        // Bitcoin
        document.getElementById('addBitcoin').addEventListener('click', () => this.addBitcoinAccount());

        // CSV Import
        document.getElementById('csvFileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('importCsv').addEventListener('click', () => this.importCSV());

        // Data Management
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importData').addEventListener('click', () => {
            document.getElementById('jsonFileInput').click();
        });
        document.getElementById('jsonFileInput').addEventListener('change', (e) => this.importDataFile(e));
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());

        // History Management
        const modal = document.getElementById('historyModal');
        const btn = document.getElementById('manageHistoryBtn');
        const span = document.querySelector('.close-modal');

        if (btn) {
            btn.addEventListener('click', () => {
                this.renderHistoryTable();
                modal.classList.add('show');
            });
        }

        if (span) {
            span.addEventListener('click', () => {
                modal.classList.remove('show');
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });

        document.getElementById('addHistoryEntry').addEventListener('click', () => this.addHistoryEntry());
    }

    // ===== FI Configuration =====
    saveFIConfig() {
        const target = this.parseInputCurrency(document.getElementById('fiTarget').value);
        const rate = parseFloat(document.getElementById('withdrawalRate').value);
        const expenses = this.parseInputCurrency(document.getElementById('annualExpenses').value);

        if (isNaN(target) || target <= 0) {
            alert('Please enter a valid target amount');
            return;
        }

        if (isNaN(rate) || rate <= 0 || rate > 10) {
            alert('Please enter a valid withdrawal rate (0-10%)');
            return;
        }

        this.fiTarget = target;
        this.withdrawalRate = rate;
        this.annualExpenses = expenses || (target * (rate / 100));
        
        this.saveData();
        this.updateDashboard();
        this.showNotification('FI goal saved successfully!');
    }

    // ===== Add Accounts =====
    addManualAccount() {
        const name = document.getElementById('accountName').value.trim();
        const type = document.getElementById('accountType').value;
        const balance = this.parseInputCurrency(document.getElementById('accountBalance').value);

        if (!name) {
            alert('Please enter an account name');
            return;
        }

        if (isNaN(balance) || balance < 0) {
            alert('Please enter a valid balance');
            return;
        }

        const id = Date.now();
        const account = {
            id: id,
            number: `MANUAL-${id}`,
            name: name,
            type: type,
            balance: balance,
            source: 'manual',
            lastUpdated: new Date().toISOString(),
            holdings: [{
                symbol: '',
                description: name,
                quantity: 1,
                value: balance,
                assetClass: this.inferAssetClassFromType(type)
            }]
        };

        this.accounts.push(account);
        this.saveData();
        this.updateDashboard();
        this.clearManualAccountForm();
        this.showNotification(`Account "${name}" added successfully!`);
    }

    addBitcoinAccount() {
        const amount = parseFloat(document.getElementById('btcAmount').value);
        const price = parseFloat(document.getElementById('btcPrice').value);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid Bitcoin amount');
            return;
        }

        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid Bitcoin price');
            return;
        }

        const balance = amount * price;
        const id = Date.now();
        const account = {
            id: id,
            number: `BTC-${id}`,
            name: `Bitcoin (${amount.toFixed(8)} BTC)`,
            type: 'crypto',
            balance: balance,
            source: 'bitcoin',
            btcAmount: amount,
            btcPrice: price,
            lastUpdated: new Date().toISOString(),
            holdings: [{
                symbol: 'BTC',
                description: 'Bitcoin',
                quantity: amount,
                value: balance,
                assetClass: 'Crypto'
            }]
        };

        this.accounts.push(account);
        this.saveData();
        this.updateDashboard();
        this.clearBitcoinForm();
        this.showNotification(`Bitcoin account added: ${amount} BTC = $${balance.toLocaleString()}`);
    }

    // ===== CSV Import =====
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('importCsv').disabled = false;
        } else {
            document.getElementById('fileName').textContent = 'No file chosen';
            document.getElementById('importCsv').disabled = true;
        }
    }

    importCSV() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const csv = e.target.result;
            this.parseCSV(csv, file.name);
        };
        reader.readAsText(file);
    }

    parseCSV(csv, filename) {
        const lines = csv.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            alert('CSV file appears to be empty');
            return;
        }

        // For Schwab, skip any title/header lines and find the first actual data section
        let firstLine = lines[0];
        let isSchwab = false;
        let isFidelity = false;
        
        // Check if this looks like a Schwab file (has title line or account sections)
        if (firstLine.toLowerCase().includes('positions for') || 
            lines.some(line => line.match(/^\w+.*\.{3}\d+/))) {
            isSchwab = true;
        } else {
            // Try to detect from headers
            const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
            isSchwab = this.detectSchwabFormat(headers);
            isFidelity = this.detectFidelityFormat(headers);
        }

        let importedCount = 0;

        if (isSchwab) {
            importedCount = this.parseSchwabCSV(lines);
        } else if (isFidelity) {
            const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
            importedCount = this.parseFidelityCSV(lines, headers);
        } else {
            const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
            alert('Unrecognized CSV format. Please use Schwab or Fidelity position exports.\n\nHeaders found: ' + headers.join(', '));
            return;
        }

        if (importedCount > 0) {
            this.saveData();
            this.updateDashboard();
            this.showNotification(`Successfully imported ${importedCount} account(s) from ${isSchwab ? 'Schwab' : 'Fidelity'}`);
            
            // Reset file input
            document.getElementById('csvFileInput').value = '';
            document.getElementById('fileName').textContent = 'No file chosen';
            document.getElementById('importCsv').disabled = true;
        } else {
            alert('No valid positions found in CSV');
        }
    }

    detectSchwabFormat(headers) {
        // Schwab typically has: Symbol, Description, Quantity, Price, Mkt Val, etc.
        const schwabIndicators = ['symbol', 'mkt val'];
        return schwabIndicators.every(indicator => 
            headers.some(h => h.includes(indicator))
        );
    }

    detectFidelityFormat(headers) {
        // Fidelity typically has: Account Number, Account Name, Symbol, Current Value, etc.
        const fidelityIndicators = ['account number', 'account name', 'current value'];
        return fidelityIndicators.every(indicator => 
            headers.some(h => h.includes(indicator))
        );
    }

    parseSchwabCSV(lines) {
        let importedCount = 0;
        let currentAccountName = null;
        let currentAccountNumber = null;
        let currentHoldings = [];
        
        // Column indices (defaults based on sample)
        let idx = {
            symbol: 0,
            description: 1,
            qty: 2,
            value: 6
        };

        // Helper to save the current account being processed
        const saveCurrentAccount = () => {
            if (currentAccountNumber && currentHoldings.length > 0) {
                const totalBalance = currentHoldings.reduce((sum, h) => sum + h.value, 0);
                const accountName = currentAccountName || `Schwab - ${currentAccountNumber}`;
                
                // Check if account exists by Number OR Name (legacy support)
                let existingIndex = this.accounts.findIndex(acc => 
                    (acc.number && String(acc.number) === String(currentAccountNumber)) ||
                    (acc.name === `Schwab - ${currentAccountName}`)
                );
                
                const accountData = {
                    id: currentAccountNumber, // Use account number as ID
                    number: currentAccountNumber,
                    name: accountName,
                    type: this.inferAccountType(currentAccountName || ''),
                    balance: totalBalance,
                    source: 'schwab_csv',
                    holdings: currentHoldings,
                    lastUpdated: new Date().toISOString()
                };

                if (existingIndex >= 0) {
                    // Preserve original ID if updating legacy account to avoid duplicates
                    const originalId = this.accounts[existingIndex].id;
                    this.accounts[existingIndex] = { ...this.accounts[existingIndex], ...accountData, id: originalId };
                } else {
                    this.accounts.push(accountData);
                }
                importedCount++;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Detect Account Header: "Tony_IRA ...689"
            const accountMatch = line.match(/^([^,]+?)\s+\.{3}(\d+)/);
            if (accountMatch) {
                saveCurrentAccount();
                currentAccountName = accountMatch[1].trim();
                currentAccountNumber = accountMatch[2].trim();
                currentHoldings = [];
                continue;
            }

            // Detect Headers to update indices
            if (line.toLowerCase().includes('"symbol"') && line.toLowerCase().includes('"description"')) {
                const headers = this.parseCSVLine(line).map(h => h.toLowerCase().replace(/"/g, '').trim());
                idx.symbol = headers.findIndex(h => h === 'symbol');
                idx.description = headers.findIndex(h => h === 'description');
                idx.qty = headers.findIndex(h => h.includes('quantity') || h.includes('qty'));
                idx.value = headers.findIndex(h => h.includes('market value') || h.includes('mkt val'));
                continue;
            }

            // Skip "Account Total" lines
            if (line.includes('"Account Total"')) continue;

            // Parse Data Rows
            const cells = this.parseCSVLine(line);
            
            if (cells.length > idx.value && currentAccountNumber) {
                const symbol = cells[idx.symbol]?.replace(/"/g, '').trim();
                const description = cells[idx.description]?.replace(/"/g, '').trim();
                
                // Skip header rows if they appear again
                if (symbol === 'Symbol' || description === 'Description') continue;

                const qtyStr = cells[idx.qty]?.replace(/"/g, '').replace(/,/g, '');
                const valStr = cells[idx.value]?.replace(/"/g, '').replace(/[$,]/g, '');
                
                const value = parseFloat(valStr);
                
                if (!isNaN(value) && value > 0) {
                    let assetClass = 'Stock/ETF';
                    if (symbol === 'Cash & Cash Investments' || description.includes('Cash') || description.includes('Money Market')) {
                        assetClass = 'Cash';
                    }

                    currentHoldings.push({
                        symbol: symbol === 'Cash & Cash Investments' ? 'CASH' : symbol,
                        description: description,
                        quantity: parseFloat(qtyStr) || 0,
                        value: value,
                        assetClass: assetClass
                    });
                }
            }
        }
        
        saveCurrentAccount();

        return importedCount;
    }

    parseFidelityCSV(lines, headers) {
        const accountNumIdx = headers.findIndex(h => h.includes('account number'));
        const accountNameIdx = headers.findIndex(h => h.includes('account name'));
        const symbolIdx = headers.findIndex(h => h.includes('symbol'));
        const descriptionIdx = headers.findIndex(h => h.includes('description'));
        const quantityIdx = headers.findIndex(h => h.includes('quantity'));
        const valueIdx = headers.findIndex(h => h.includes('current value'));
        const typeIdx = headers.findIndex(h => h.includes('type')); // Sometimes present
        
        let importedCount = 0;
        const accountsMap = new Map(); // Map<AccountNumber, AccountData>

        // Iterate rows
        for (let i = 1; i < lines.length; i++) {
            const cells = this.parseCSVLine(lines[i]);
            
            if (cells.length > Math.max(accountNumIdx, valueIdx)) {
                const accountNum = cells[accountNumIdx]?.replace(/"/g, '').trim();
                const accountName = cells[accountNameIdx]?.replace(/"/g, '').trim();
                const description = cells[descriptionIdx]?.replace(/"/g, '').trim();
                const symbol = cells[symbolIdx]?.replace(/"/g, '').trim();
                const valueStr = cells[valueIdx]?.replace(/"/g, '').replace(/[$,]/g, '').trim();
                const value = parseFloat(valueStr);
                const type = (typeIdx >= 0 && cells[typeIdx]) ? cells[typeIdx].replace(/"/g, '').trim() : '';

                // Skip BROKERAGELINK summary rows (keep the detail rows)
                if (description === 'BROKERAGELINK' && !symbol) {
                    continue;
                }

                // Skip empty rows or invalid accounts
                if (!accountNum || !accountName) {
                    continue;
                }

                if (!isNaN(value) && value > 0) {
                    if (!accountsMap.has(accountNum)) {
                        accountsMap.set(accountNum, {
                            name: accountName,
                            holdings: []
                        });
                    }

                    // Infer Asset Class
                    let assetClass = 'Stock/ETF';
                    if ((type && type.toLowerCase().includes('cash')) || symbol === 'FDRXX' || description.includes('MONEY MARKET') || description.includes('Cash')) {
                        assetClass = 'Cash';
                    }

                    accountsMap.get(accountNum).holdings.push({
                        symbol: symbol,
                        description: description,
                        quantity: parseFloat(cells[quantityIdx]?.replace(/"/g, '')) || 0,
                        value: value,
                        assetClass: assetClass
                    });
                }
            }
        }

        // Create/Update accounts
        accountsMap.forEach((data, accountNum) => {
            const totalBalance = data.holdings.reduce((sum, h) => sum + h.value, 0);
            
            if (totalBalance > 0) {
                const accountName = `Fidelity - ${data.name}`;
                
                // Check if account exists by Number OR Name (legacy support)
                let existingIndex = this.accounts.findIndex(acc => 
                    (acc.number && String(acc.number) === String(accountNum)) ||
                    (acc.name === accountName)
                );
                
                const accountData = {
                    id: accountNum,
                    number: accountNum,
                    name: accountName,
                    type: this.inferAccountType(data.name),
                    balance: totalBalance,
                    source: 'fidelity_csv',
                    holdings: data.holdings,
                    lastUpdated: new Date().toISOString()
                };

                if (existingIndex >= 0) {
                    // Preserve original ID if updating legacy account
                    const originalId = this.accounts[existingIndex].id;
                    this.accounts[existingIndex] = { ...this.accounts[existingIndex], ...accountData, id: originalId };
                } else {
                    this.accounts.push(accountData);
                }
                importedCount++;
            }
        });

        return importedCount;
    }

    inferAccountType(accountName) {
        const name = accountName.toLowerCase();
        if (name.includes('401k') || name.includes('401(k)')) return '401k';
        if (name.includes('roth')) return 'roth';
        if (name.includes('ira') && !name.includes('roth')) return 'ira';
        if (name.includes('hsa') || name.includes('health')) return 'other';
        if (name.includes('brokerage')) return 'brokerage';
        return 'brokerage';
    }

    parseCSVLine(line) {
        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === ',' && !inQuotes) {
                cells.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        cells.push(current);

        return cells;
    }

    // ===== Account Management =====
    deleteAccount(id) {
        if (confirm('Are you sure you want to delete this account?')) {
            // Handle both string and number IDs
            this.accounts = this.accounts.filter(acc => String(acc.id) !== String(id));
            this.saveData();
            this.updateDashboard();
            this.showNotification('Account deleted successfully');
        }
    }

    // ===== Dashboard Updates =====
    updateDashboard() {
        const totalNetWorth = this.calculateTotalNetWorth();
        const fiProgress = (totalNetWorth / this.fiTarget) * 100;
        const annualIncome = totalNetWorth * (this.withdrawalRate / 100);
        const remaining = Math.max(0, this.fiTarget - totalNetWorth);

        // Update stats
        document.getElementById('totalNetWorth').textContent = this.formatCurrency(totalNetWorth);
        document.getElementById('fiProgress').textContent = fiProgress.toFixed(1) + '%';
        document.getElementById('annualIncome').textContent = this.formatCurrency(annualIncome);
        document.getElementById('remainingAmount').textContent = this.formatCurrency(remaining);
        document.getElementById('withdrawalRateDisplay').textContent = this.withdrawalRate;

        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = Math.min(100, fiProgress).toFixed(1) + '%';

        // Update accounts table
        this.updateAccountsTable();

        // Update Holdings
        this.renderHoldings();

        // Update charts
        this.updateAllocationChart();
        
        // Update History
        this.updateHistory(totalNetWorth);
        this.renderHistoryChart();

        // Update Projections
        this.updateProjections(totalNetWorth);
    }

    updateHistory(currentNetWorth) {
        const today = new Date().toISOString().split('T')[0];
        const lastEntry = this.history[this.history.length - 1];

        if (!lastEntry || lastEntry.date !== today) {
            this.history.push({ date: today, netWorth: currentNetWorth });
        } else {
            lastEntry.netWorth = currentNetWorth;
        }
        
        // Keep history sorted just in case
        this.history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Save is handled by caller usually, but let's ensure it's saved if we modified it
        // However, updateDashboard is called often, so we don't want to loop save.
        // We'll rely on the fact that updateDashboard is usually called after a change that triggers save.
        // But if we just loaded the page and updated history, we might want to save.
        // For now, let's leave explicit saving to the actions.
    }

    renderHistoryChart() {
        const ctx = document.getElementById('historyChart');
        if (!ctx) return;

        const labels = this.history.map(h => h.date);
        const data = this.history.map(h => h.netWorth);

        if (this.historyChart) {
            this.historyChart.data.labels = labels;
            this.historyChart.data.datasets[0].data = data;
            this.historyChart.update();
        } else {
            this.historyChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Net Worth History',
                        data: data,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Net Worth History',
                            color: '#e5e7eb'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: function(value) {
                                    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                                    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                    return '$' + value;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    renderHoldings() {
        const tbody = document.getElementById('holdingsList');
        if (!tbody) return;

        // Aggregate holdings
        const holdingsMap = new Map();

        this.accounts.forEach(acc => {
            if (acc.holdings && Array.isArray(acc.holdings) && acc.holdings.length > 0) {
                acc.holdings.forEach(h => {
                    const key = h.symbol || h.description; // Fallback if symbol is missing
                    if (!holdingsMap.has(key)) {
                        holdingsMap.set(key, {
                            symbol: h.symbol,
                            description: h.description,
                            assetClass: h.assetClass || 'Unknown',
                            value: 0
                        });
                    }
                    holdingsMap.get(key).value += h.value;
                });
            } else if (acc.balance > 0) {
                // Handle accounts without detailed holdings (e.g. manual entry)
                const key = acc.name;
                if (!holdingsMap.has(key)) {
                    holdingsMap.set(key, {
                        symbol: '',
                        description: acc.name,
                        assetClass: this.inferAssetClassFromType(acc.type),
                        value: 0
                    });
                }
                holdingsMap.get(key).value += acc.balance;
            }
        });

        const totalNetWorth = this.calculateTotalNetWorth();
        const sortedHoldings = Array.from(holdingsMap.values()).sort((a, b) => b.value - a.value);

        tbody.innerHTML = sortedHoldings.map(h => {
            const percentage = totalNetWorth > 0 ? (h.value / totalNetWorth * 100).toFixed(2) : 0;
            return `
                <tr>
                    <td>${h.symbol || '-'}</td>
                    <td>${h.description}</td>
                    <td>${h.assetClass}</td>
                    <td>${this.formatCurrency(h.value)}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }).join('');
    }

    inferAssetClassFromType(type) {
        if (type === 'crypto') return 'Crypto';
        if (type === 'cash' || type === 'savings') return 'Cash';
        return 'Other';
    }

    calculateTotalNetWorth() {
        return this.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    }

    updateAccountsTable() {
        const tbody = document.getElementById('accountsTableBody');
        const totalNetWorth = this.calculateTotalNetWorth();

        if (this.accounts.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="5">No accounts added yet. Add your first account above!</td></tr>';
            return;
        }

        // Group accounts
        const groups = {};
        this.accounts.forEach(acc => {
            const type = this.formatAccountType(acc.type);
            if (!groups[type]) groups[type] = [];
            groups[type].push(acc);
        });

        let html = '';
        
        Object.keys(groups).sort().forEach(groupName => {
            const groupAccounts = groups[groupName];
            const groupTotal = groupAccounts.reduce((sum, acc) => sum + acc.balance, 0);
            
            // Group Header
            html += `
                <tr class="group-header">
                    <td colspan="5" style="background-color: rgba(255,255,255,0.05); font-weight: bold; padding-top: 1rem;">
                        ${groupName} <span style="font-weight: normal; opacity: 0.7">(${this.formatCurrency(groupTotal)})</span>
                    </td>
                </tr>
            `;

            // Accounts
            groupAccounts.forEach(account => {
                const percentage = totalNetWorth > 0 ? (account.balance / totalNetWorth * 100).toFixed(1) : 0;
                const lastUpdated = account.lastUpdated ? new Date(account.lastUpdated).toLocaleDateString() : 'N/A';
                
                html += `
                    <tr>
                        <td style="padding-left: 1.5rem;">
                            ${this.escapeHtml(account.name)}
                            <div style="font-size: 0.75rem; opacity: 0.6;">Updated: ${lastUpdated}</div>
                        </td>
                        <td><span class="account-type-badge ${account.type}">${this.formatAccountType(account.type)}</span></td>
                        <td>${this.formatCurrency(account.balance)}</td>
                        <td>${percentage}%</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="tracker.deleteAccount('${account.id}')">Delete</button>
                        </td>
                    </tr>
                `;
            });
        });

        tbody.innerHTML = html;
    }

    updateAllocationChart() {
        const ctx = document.getElementById('allocationChart');
        
        if (this.accounts.length === 0) {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            return;
        }

        // Group by account type
        const typeGroups = {};
        this.accounts.forEach(account => {
            if (!typeGroups[account.type]) {
                typeGroups[account.type] = 0;
            }
            typeGroups[account.type] += account.balance;
        });

        const labels = Object.keys(typeGroups).map(type => this.formatAccountType(type));
        const data = Object.values(typeGroups);
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
        ];

        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = data;
            this.chart.update();
        } else {
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2,
                        borderColor: '#1f2937'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#e5e7eb',
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = this.formatCurrency(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // ===== Data Management =====
    exportData() {
        const data = {
            accounts: this.accounts,
            fiTarget: this.fiTarget,
            withdrawalRate: this.withdrawalRate,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tapfi-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!');
    }

    importDataFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.accounts || !Array.isArray(data.accounts)) {
                    alert('Invalid data file format');
                    return;
                }

                if (confirm('This will replace all current data. Continue?')) {
                    this.accounts = data.accounts;
                    this.fiTarget = data.fiTarget || 1000000;
                    this.withdrawalRate = data.withdrawalRate || 4;
                    
                    document.getElementById('fiTarget').value = this.fiTarget;
                    document.getElementById('withdrawalRate').value = this.withdrawalRate;
                    
                    this.saveData();
                    this.updateDashboard();
                    this.showNotification('Data imported successfully!');
                }
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
            
            // Reset file input
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            if (confirm('Really delete everything? Consider exporting first.')) {
                localStorage.removeItem('tapfi_data');
                this.accounts = [];
                this.fiTarget = 1000000;
                this.withdrawalRate = 4;
                
                document.getElementById('fiTarget').value = this.fiTarget;
                document.getElementById('withdrawalRate').value = this.withdrawalRate;
                
                this.updateDashboard();
                this.showNotification('All data cleared');
            }
        }
    }

    // ===== Utilities =====
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // Format number with commas for input fields (no symbol)
    formatInputCurrency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '';
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Parse currency string (remove commas) to float
    parseInputCurrency(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(value.replace(/,/g, '')) || 0;
    }

    // Real-time formatting for input fields
    handleCurrencyInput(input) {
        const cursor = input.selectionStart;
        const oldVal = input.value;
        
        // Strip non-numeric/non-dot
        let raw = oldVal.replace(/[^0-9.]/g, '');
        
        // Handle multiple dots
        const parts = raw.split('.');
        if (parts.length > 2) {
            raw = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Format integer part
        const dotIndex = raw.indexOf('.');
        let integerPart = dotIndex === -1 ? raw : raw.substring(0, dotIndex);
        let decimalPart = dotIndex === -1 ? '' : raw.substring(dotIndex);
        
        // Remove leading zeros
        if (integerPart.length > 1 && integerPart.startsWith('0')) {
            integerPart = integerPart.replace(/^0+/, '');
        }
        
        // Add commas
        const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const newVal = formattedInt + decimalPart;
        
        if (newVal !== oldVal) {
            input.value = newVal;
            
            // Restore cursor position
            // Count non-comma chars before cursor in old string
            const nonCommasBefore = oldVal.slice(0, cursor).replace(/,/g, '').length;
            
            // Find position in new string with same number of non-comma chars
            let newCursor = 0;
            let count = 0;
            for (let i = 0; i < newVal.length; i++) {
                if (newVal[i] !== ',') count++;
                newCursor++;
                if (count === nonCommasBefore) break;
            }
            input.setSelectionRange(newCursor, newCursor);
        }
    }

    formatAccountType(type) {
        const types = {
            'brokerage': 'Brokerage',
            '401k': '401(k)',
            'ira': 'IRA',
            'roth': 'Roth IRA',
            'savings': 'Savings',
            'crypto': 'Crypto',
            'other': 'Other'
        };
        return types[type] || type;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        // Simple notification - could be enhanced with a toast library
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    clearManualAccountForm() {
        document.getElementById('accountName').value = '';
        document.getElementById('accountType').value = 'brokerage';
        document.getElementById('accountBalance').value = '';
    }

    clearBitcoinForm() {
        document.getElementById('btcAmount').value = '';
        document.getElementById('btcPrice').value = '';
    }

    // ===== History Management =====
    addHistoryEntry() {
        const dateInput = document.getElementById('historyDate');
        const amountInput = document.getElementById('historyAmount');
        
        const date = dateInput.value;
        const amount = this.parseInputCurrency(amountInput.value);

        if (!date) {
            alert('Please select a date');
            return;
        }

        if (isNaN(amount)) {
            alert('Please enter a valid amount');
            return;
        }

        // Check if entry exists for this date
        const existingIndex = this.history.findIndex(h => h.date === date);
        
        if (existingIndex >= 0) {
            if (confirm(`An entry for ${date} already exists. Overwrite?`)) {
                this.history[existingIndex].netWorth = amount;
            } else {
                return;
            }
        } else {
            this.history.push({ date: date, netWorth: amount });
        }

        // Sort history
        this.history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        this.saveData();
        this.renderHistoryTable();
        this.renderHistoryChart();
        
        // Clear inputs
        dateInput.value = '';
        amountInput.value = '';
        
        this.showNotification('History entry added');
    }

    deleteHistoryEntry(index) {
        if (confirm('Delete this history entry?')) {
            this.history.splice(index, 1);
            this.saveData();
            this.renderHistoryTable();
            this.renderHistoryChart();
        }
    }

    renderHistoryTable() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (this.history.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="3">No history data available</td></tr>';
            return;
        }

        // Sort descending for table view
        const sortedHistory = [...this.history].sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sortedHistory.map((entry, index) => {
            // Calculate original index for deletion
            const originalIndex = this.history.findIndex(h => h.date === entry.date);
            
            return `
                <tr>
                    <td>${entry.date}</td>
                    <td>${this.formatCurrency(entry.netWorth)}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="tracker.deleteHistoryEntry(${originalIndex})">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ===== Projections & Simulations =====
    updateProjections(currentNetWorth) {
        this.updateFIMetrics(currentNetWorth);
        this.updateProjectionChart(currentNetWorth);
    }

    updateFIMetrics(currentNetWorth) {
        // Coast FI Calculation
        // Future Value = PV * (1 + r)^n
        const yearsToRetirement = Math.max(0, this.retirementAge - this.currentAge);
        const coastAmount = currentNetWorth * Math.pow(1 + (this.annualReturn / 100), yearsToRetirement);
        
        const coastAgeEl = document.getElementById('coastTargetAge');
        if (coastAgeEl) coastAgeEl.textContent = this.retirementAge;
        
        const coastAmountEl = document.getElementById('coastFiAmount');
        if (coastAmountEl) coastAmountEl.textContent = this.formatCurrency(coastAmount);

        // FI Days Calculation
        // (Net Worth / FI Target) * 365
        const fiDays = this.fiTarget > 0 ? (currentNetWorth / this.fiTarget) * 365 : 0;
        const fiDaysEl = document.getElementById('fiDays');
        if (fiDaysEl) fiDaysEl.textContent = Math.floor(fiDays);

        // Financial Runway (Net Worth / Annual Expenses)
        const runway = this.annualExpenses > 0 ? currentNetWorth / this.annualExpenses : 0;
        const runwayEl = document.getElementById('financialRunway');
        if (runwayEl) runwayEl.textContent = runway.toFixed(1) + ' Years';

        // Passive Wage ((Net Worth * Return) / 8760 hours)
        const passiveIncome = currentNetWorth * (this.annualReturn / 100);
        const hourlyWage = passiveIncome / 8760;
        const wageEl = document.getElementById('passiveWage');
        if (wageEl) wageEl.textContent = '$' + hourlyWage.toFixed(2) + '/hr';

        // Barista Gap ((Expenses - Safe Withdrawal Amount) / 12)
        const safeWithdrawalAmount = currentNetWorth * (this.withdrawalRate / 100);
        const monthlyGap = Math.max(0, (this.annualExpenses - safeWithdrawalAmount) / 12);
        const gapEl = document.getElementById('baristaGap');
        if (gapEl) gapEl.textContent = this.formatCurrency(monthlyGap);
    }

    updateProjectionChart(currentNetWorth) {
        const ctx = document.getElementById('projectionChart');
        if (!ctx) return;

        // Calculate projection data
        const labels = [];
        const data = [];
        const targetLine = [];
        
        let balance = currentNetWorth;
        let year = new Date().getFullYear();
        let fiYear = null;

        // Calculate maxYears based on retirement age or user-specified years
        let maxYears;
        if (this.projectionYears !== null && this.projectionYears > 0) {
            // User specified custom projection years
            maxYears = Math.floor(this.projectionYears);
        } else {
            // Auto-calculate: years until retirement + 5 year buffer
            const yearsToRetirement = Math.max(0, this.retirementAge - this.currentAge);
            maxYears = yearsToRetirement + 5; // Add 5 years post-retirement for visibility
            
            // Ensure minimum of 10 years and maximum of 50 years for reasonable display
            maxYears = Math.max(10, Math.min(50, maxYears));
        }
        
        for (let i = 0; i <= maxYears; i++) {
            labels.push(year + i);
            data.push(balance);
            targetLine.push(this.fiTarget);

            if (balance >= this.fiTarget && !fiYear) {
                fiYear = year + i;
            }

            // Compound interest + Contribution
            balance = balance * (1 + this.annualReturn / 100) + (this.monthlyContribution * 12);
        }

        // Update FI Date Display
        const dateEl = document.getElementById('projectedFiDate');
        if (dateEl) {
            if (fiYear) {
                const yearsAway = fiYear - year;
                dateEl.textContent = `${fiYear} (in ${yearsAway} years)`;
            } else {
                dateEl.textContent = `> ${year + maxYears}`;
            }
        }

        // Render Chart
        if (this.projectionChart) {
            this.projectionChart.destroy();
        }

        this.projectionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Projected Net Worth',
                        data: data,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'FI Target',
                        data: targetLine,
                        borderColor: '#e74c3c',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'k';
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Initialize app
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new FITracker();
});
