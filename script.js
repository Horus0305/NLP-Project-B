function openDialog() {
    document.getElementById('api-key-dialog').style.display = 'block';
}

function closeDialog() {
    document.getElementById('api-key-dialog').style.display = 'none';
}

function saveApiKey() {
    const apiKey = document.getElementById('api-key-input').value;
    if (apiKey) {
        // Save the API key (you can implement local storage or other methods)
        console.log('API Key saved:', apiKey);
        closeDialog();
    } else {
        alert('Please enter a valid API Key.');
    }
}

// Close the dialog when clicking outside of it
window.onclick = function(event) {
    const dialog = document.getElementById('api-key-dialog');
    if (event.target === dialog) {
        closeDialog();
    }
}