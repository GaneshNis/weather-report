document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveBtn');
    const weatherInput = document.getElementById('weatherInput');
    const historyList = document.getElementById('historyList');

    const backendUrl = 'YOUR_BACKEND_API_URL_HERE'; // Replace with your Azure App Service URL

    // Function to save a new note
    saveBtn.addEventListener('click', async () => {
        const note = weatherInput.value.trim();
        if (note) {
            try {
                const response = await fetch(`${backendUrl}/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ note: note })
                });
                if (response.ok) {
                    alert('Note saved successfully!');
                    weatherInput.value = '';
                    fetchHistory(); // Refresh history after saving
                } else {
                    alert('Failed to save note.');
                }
            } catch (error) {
                console.error('Error saving note:', error);
                alert('An error occurred. Please try again.');
            }
        }
    });

    // Function to fetch all history
    const fetchHistory = async () => {
        try {
            const response = await fetch(`${backendUrl}/history`);
            const data = await response.json();
            historyList.innerHTML = ''; // Clear existing history
            data.forEach(item => {
                const li = document.createElement('li');
                const date = new Date(item.date).toLocaleDateString();
                li.textContent = `${date}: ${item.note}`;
                historyList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    // Initial fetch of history when the page loads
    fetchHistory();
});