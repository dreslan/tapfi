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

        this.chart = null;
        this.projectionChart = null;
        
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
                
                // Load Projections
                this.monthlyContribution = data.monthlyContribution !== undefined ? data.monthlyContribution : 2000;
                this.annualReturn = data.annualReturn !== undefined ? data.annualReturn : 7;
                this.currentAge = data.currentAge !== undefined ? data.currentAge : 30;
                this.retirementAge = data.retirementAge !== undefined ? data.retirementAge : 65;

                // Populate config inputs
                document.getElementById('fiTarget').value = this.fiTarget;
                document.getElementById('withdrawalRate').value = this.withdrawalRate;
                document.getElementById('annualExpenses').value = this.annualExpenses;
                
                // Populate projection inputs
                const mcInput = document.getElementById('monthlyContribution');
                if (mcInput) {
                    mcInput.value = this.monthlyContribution;
                    document.getElementById('annualReturn').value = this.annualReturn;
                    document.getElementById('currentAge').value = this.currentAge;
                    document.getElementById('retirementAge').value = this.retirementAge;
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
            
            // Save Projections
            monthlyContribution: this.monthlyContribution,
            annualReturn: this.annualReturn,
            currentAge: this.currentAge,
            retirementAge: this.retirementAge,

            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('tapfi_data', JSON.stringify(data));
    }

    // ===== Event Listeners =====
    initializeEventListeners() {
        // FI Config
        document.getElementById('saveConfig').addEventListener('click', () => this.saveFIConfig());
        
        // Auto-calculate Target from Expenses
        document.getElementById('annualExpenses').addEventListener('input', (e) => {
            const expenses = parseFloat(e.target.value);
            const rate = parseFloat(document.getElementById('withdrawalRate').value);
            if (expenses && rate) {
                const target = expenses / (rate / 100);
                document.getElementById('fiTarget').value = Math.round(target);
            }
        });

        // Auto-calculate Target from Rate (if Expenses exist)
        document.getElementById('withdrawalRate').addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            const expenses = parseFloat(document.getElementById('annualExpenses').value);
            if (expenses && rate) {
                const target = expenses / (rate / 100);
                document.getElementById('fiTarget').value = Math.round(target);
            }
        });

        // Auto-calculate Expenses from Target (Reverse calculation)
        document.getElementById('fiTarget').addEventListener('input', (e) => {
            const target = parseFloat(e.target.value);
            const rate = parseFloat(document.getElementById('withdrawalRate').value);
            if (target && rate) {
                const expenses = target * (rate / 100);
                document.getElementById('annualExpenses').value = Math.round(expenses);
            }
        });

        // Projections Inputs
        ['monthlyContribution', 'annualReturn', 'currentAge', 'retirementAge'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    this[id] = parseFloat(el.value) || 0;
                    this.saveData();
                    this.updateDashboard(); // Real-time updates
                });
            }
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
    }

    // ===== FI Configuration =====
    saveFIConfig() {
        const target = parseFloat(document.getElementById('fiTarget').value);
        const rate = parseFloat(document.getElementById('withdrawalRate').value);
        const expenses = parseFloat(document.getElementById('annualExpenses').value);

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
        const balance = parseFloat(document.getElementById('accountBalance').value);

        if (!name) {
            alert('Please enter an account name');
            return;
        }

        if (isNaN(balance) || balance < 0) {
            alert('Please enter a valid balance');
            return;
        }

        const account = {
            id: Date.now(),
            name: name,
            type: type,
            balance: balance,
            source: 'manual'
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
        const account = {
            id: Date.now(),
            name: `Bitcoin (${amount.toFixed(8)} BTC)`,
            type: 'crypto',
            balance: balance,
            source: 'bitcoin',
            btcAmount: amount,
            btcPrice: price
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
        const accountTotals = new Map();
        let currentAccount = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Look for lines that are account names (followed by account number pattern)
            const accountMatch = line.match(/^([^,]+?)\s+\.{3}(\d+)/);
            if (accountMatch) {
                currentAccount = accountMatch[1].trim();
                accountTotals.set(currentAccount, 0);
                continue;
            }
            
            // Check for "Account Total" lines that have the total value
            if (line.includes('Account Total') && currentAccount) {
                const cells = this.parseCSVLine(line);
                // Find the market value - typically around index 6-7 in Schwab format
                for (let j = 0; j < cells.length; j++) {
                    const cell = cells[j]?.replace(/"/g, '').replace(/[$,]/g, '').trim();
                    // Look for the total dollar amount (should be after several "--" entries)
                    if (cell && cell.match(/^\d+\.\d{2}$/) && parseFloat(cell) > 100) {
                        const total = parseFloat(cell);
                        if (!isNaN(total) && total > 0) {
                            accountTotals.set(currentAccount, total);
                            break;
                        }
                    }
                }
                continue;
            }
        }

        // Create accounts from totals
        accountTotals.forEach((balance, accountName) => {
            if (balance > 0) {
                const account = {
                    id: Date.now() + importedCount,
                    name: `Schwab - ${accountName}`,
                    type: this.inferAccountType(accountName),
                    balance: balance,
                    source: 'schwab_csv'
                };
                this.accounts.push(account);
                importedCount++;
            }
        });

        return importedCount;
    }

    parseFidelityCSV(lines, headers) {
        const accountNumIdx = headers.findIndex(h => h.includes('account number'));
        const accountNameIdx = headers.findIndex(h => h.includes('account name'));
        const descriptionIdx = headers.findIndex(h => h.includes('description'));
        const valueIdx = headers.findIndex(h => h.includes('current value'));
        
        let importedCount = 0;
        const accountTotals = new Map();
        const brokerageLinkAccounts = new Set();

        // First pass: identify BROKERAGELINK placeholder rows
        for (let i = 1; i < lines.length; i++) {
            const cells = this.parseCSVLine(lines[i]);
            
            if (cells.length > Math.max(accountNumIdx, descriptionIdx)) {
                const description = cells[descriptionIdx]?.replace(/"/g, '').trim().toUpperCase();
                const accountNum = cells[accountNumIdx]?.replace(/"/g, '').trim();
                
                if (description === 'BROKERAGELINK' && accountNum) {
                    brokerageLinkAccounts.add(accountNum);
                }
            }
        }

        // Second pass: aggregate values, skipping BROKERAGELINK placeholder rows
        for (let i = 1; i < lines.length; i++) {
            const cells = this.parseCSVLine(lines[i]);
            
            if (cells.length > Math.max(accountNumIdx, accountNameIdx, valueIdx)) {
                const accountNum = cells[accountNumIdx]?.replace(/"/g, '').trim();
                const accountName = cells[accountNameIdx]?.replace(/"/g, '').trim();
                const description = cells[descriptionIdx]?.replace(/"/g, '').trim().toUpperCase();
                const valueStr = cells[valueIdx]?.replace(/"/g, '').replace(/[$,]/g, '').trim();
                const value = parseFloat(valueStr);

                // Skip BROKERAGELINK placeholder rows (they're summaries of other accounts)
                if (description === 'BROKERAGELINK') {
                    continue;
                }

                // Skip empty rows
                if (!accountNum || !accountName) {
                    continue;
                }

                if (!isNaN(value) && value > 0) {
                    const key = `${accountNum}|${accountName}`;
                    accountTotals.set(key, (accountTotals.get(key) || 0) + value);
                }
            }
        }

        // Create accounts from aggregated totals
        accountTotals.forEach((balance, key) => {
            const [accountNum, accountName] = key.split('|');
            if (balance > 0) {
                const account = {
                    id: Date.now() + importedCount,
                    name: `Fidelity - ${accountName}`,
                    type: this.inferAccountType(accountName),
                    balance: balance,
                    source: 'fidelity_csv'
                };
                this.accounts.push(account);
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
            this.accounts = this.accounts.filter(acc => acc.id !== id);
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

        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = Math.min(100, fiProgress).toFixed(1) + '%';

        // Update accounts table
        this.updateAccountsTable();

        // Update chart
        this.updateAllocationChart();

        // Update Projections
        this.updateProjections(totalNetWorth);
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

        tbody.innerHTML = this.accounts.map(account => {
            const percentage = totalNetWorth > 0 ? (account.balance / totalNetWorth * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td>${this.escapeHtml(account.name)}</td>
                    <td><span class="account-type-badge ${account.type}">${this.formatAccountType(account.type)}</span></td>
                    <td>${this.formatCurrency(account.balance)}</td>
                    <td>${percentage}%</td>
                    <td><button class="btn btn-danger btn-sm" onclick="tracker.deleteAccount(${account.id})">Delete</button></td>
                </tr>
            `;
        }).join('');
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

        // Project for next 30 years
        const maxYears = 30; 
        
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
