// TapFI - Financial Independence Tracker
// All data stored in localStorage

class FITracker {
    constructor() {
        this.accounts = [];
        this.fiTarget = 1000000;
        this.withdrawalRate = 4;
        this.chart = null;
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
                
                // Populate config inputs
                document.getElementById('fiTarget').value = this.fiTarget;
                document.getElementById('withdrawalRate').value = this.withdrawalRate;
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
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('tapfi_data', JSON.stringify(data));
    }

    // ===== Event Listeners =====
    initializeEventListeners() {
        // FI Config
        document.getElementById('saveConfig').addEventListener('click', () => this.saveFIConfig());

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

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        
        // Detect format
        const isSchwab = this.detectSchwabFormat(headers);
        const isFidelity = this.detectFidelityFormat(headers);

        let importedCount = 0;

        if (isSchwab) {
            importedCount = this.parseSchwabCSV(lines, headers);
        } else if (isFidelity) {
            importedCount = this.parseFidelityCSV(lines, headers);
        } else {
            alert('Unrecognized CSV format. Please use Schwab or Fidelity position exports.\n\nHeaders found: ' + headers.join(', '));
            return;
        }

        if (importedCount > 0) {
            this.saveData();
            this.updateDashboard();
            this.showNotification(`Successfully imported ${importedCount} position(s) from ${isSchwab ? 'Schwab' : 'Fidelity'}`);
            
            // Reset file input
            document.getElementById('csvFileInput').value = '';
            document.getElementById('fileName').textContent = 'No file chosen';
            document.getElementById('importCsv').disabled = true;
        } else {
            alert('No valid positions found in CSV');
        }
    }

    detectSchwabFormat(headers) {
        // Schwab typically has: Symbol, Description, Quantity, Price, Market Value, etc.
        const schwabIndicators = ['symbol', 'quantity', 'market value'];
        return schwabIndicators.every(indicator => 
            headers.some(h => h.includes(indicator))
        );
    }

    detectFidelityFormat(headers) {
        // Fidelity typically has: Account Name, Symbol, Description, Quantity, Current Value, etc.
        const fidelityIndicators = ['account name', 'current value'];
        return fidelityIndicators.every(indicator => 
            headers.some(h => h.includes(indicator))
        );
    }

    parseSchwabCSV(lines, headers) {
        const symbolIdx = headers.findIndex(h => h.includes('symbol'));
        const descIdx = headers.findIndex(h => h.includes('description'));
        const valueIdx = headers.findIndex(h => h.includes('market value') || h.includes('value'));
        
        let importedCount = 0;
        const accountName = `Schwab Import ${new Date().toLocaleDateString()}`;

        // Aggregate total value
        let totalValue = 0;

        for (let i = 1; i < lines.length; i++) {
            const cells = this.parseCSVLine(lines[i]);
            
            if (cells.length > Math.max(symbolIdx, valueIdx)) {
                const symbol = cells[symbolIdx]?.replace(/"/g, '').trim();
                const valueStr = cells[valueIdx]?.replace(/"/g, '').replace(/[$,]/g, '').trim();
                const value = parseFloat(valueStr);

                if (!isNaN(value) && value > 0) {
                    totalValue += value;
                }
            }
        }

        if (totalValue > 0) {
            const account = {
                id: Date.now(),
                name: accountName,
                type: 'brokerage',
                balance: totalValue,
                source: 'schwab_csv'
            };
            this.accounts.push(account);
            importedCount = 1;
        }

        return importedCount;
    }

    parseFidelityCSV(lines, headers) {
        const accountIdx = headers.findIndex(h => h.includes('account name'));
        const valueIdx = headers.findIndex(h => h.includes('current value'));
        
        let importedCount = 0;
        const accountName = `Fidelity Import ${new Date().toLocaleDateString()}`;

        // Aggregate total value
        let totalValue = 0;

        for (let i = 1; i < lines.length; i++) {
            const cells = this.parseCSVLine(lines[i]);
            
            if (cells.length > valueIdx) {
                const valueStr = cells[valueIdx]?.replace(/"/g, '').replace(/[$,]/g, '').trim();
                const value = parseFloat(valueStr);

                if (!isNaN(value) && value > 0) {
                    totalValue += value;
                }
            }
        }

        if (totalValue > 0) {
            const account = {
                id: Date.now(),
                name: accountName,
                type: 'brokerage',
                balance: totalValue,
                source: 'fidelity_csv'
            };
            this.accounts.push(account);
            importedCount = 1;
        }

        return importedCount;
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
}

// Initialize app
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new FITracker();
});
