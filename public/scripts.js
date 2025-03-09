document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/api/v1/payments/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        alert(result.message);
        fetchReport();
        fetchStatistics();
    } catch (error) {
        console.error('Error uploading file:', error);
    }
});

async function fetchReport() {
    try {
        const response = await fetch('/api/v1/payments/report');
        const reportData = await response.json();
        const reportTableBody = document.getElementById('reportTable').querySelector('tbody');
        reportTableBody.innerHTML = '';

        reportData.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.phone_number}</td>
                <td>${transaction.amount}</td>
                <td>${transaction.status}</td>
                <td>${transaction.result_desc || ''}</td>
                <td>${transaction.created_at}</td>
            `;
            reportTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching report:', error);
    }
}

async function fetchStatistics() {
    try {
        const response = await fetch('/api/v1/payments/statistics');
        const stats = await response.json();
        document.getElementById('totalTransactions').textContent = stats.total;
        document.getElementById('successfulTransactions').textContent = stats.successful;
        document.getElementById('failedTransactions').textContent = stats.failed;
    } catch (error) {
        console.error('Error fetching statistics:', error);
    }
}

fetchReport();
fetchStatistics();
