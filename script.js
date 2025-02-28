function openDialog() {
    document.getElementById('api-key-dialog').style.display = 'block';
    const apiKey = document.getElementById('api-key-input').value;
    const message = document.getElementById('api-key-message');
    message.style.display = apiKey ? 'none' : 'block';
}

function closeDialog() {
    document.getElementById('api-key-dialog').style.display = 'none';
}

function saveApiKey() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    const message = document.getElementById('api-key-message');
    const apiKeyButton = document.querySelector('.api-key-button');

    if (apiKey) {
        localStorage.setItem('geminiApiKey', apiKey);
        console.log('API Key saved:', apiKey);
        message.style.display = 'none';
        document.getElementById('application-tabs').style.display = 'block';
        apiKeyButton.style.display = 'none';
        showTab('job');
    } else {
        message.style.display = 'block';
        alert('Please enter a valid API Key.');
    }
}

window.onload = function () {
    const storedApiKey = localStorage.getItem('geminiApiKey');
    const apiKeyButton = document.querySelector('.api-key-button');
    const message = document.getElementById('api-key-message');

    if (storedApiKey) {
        apiKeyButton.style.display = 'none';
        message.style.display = 'none';
        document.getElementById('application-tabs').style.display = 'block';
        showTab('job');
    }
};

window.onclick = function (event) {
    const dialog = document.getElementById('api-key-dialog');
    if (event.target === dialog) {
        closeDialog();
    }
};

function showTab(tab) {
    const jobContent = document.getElementById('job-application-content');
    const tabContent = document.getElementById('tab-content');

    if (tab === 'job') {
        tabContent.style.display = 'block';
        jobContent.style.display = 'block'; // Show Job/Internship Application content
    } else if (tab === 'lor') {
        tabContent.style.display = 'block';
        jobContent.style.display = 'none'; // Hide Job/Internship Application content
        // Add LOR content handling here if needed
    }
}

async function generateApplicationLetter() {
    const resume = document.getElementById('resume-input').value.trim();
    const jobDescription = document.getElementById('job-description-input').value.trim();
    const apiKey = localStorage.getItem('geminiApiKey');
    const outputDiv = document.getElementById('application-output');

    if (!resume || !jobDescription) {
        outputDiv.innerHTML = 'Please enter both your resume and the job description.';
        return;
    }
    
    if (!apiKey) {
        outputDiv.innerHTML = 'API Key is missing. Please add your API key first.';
        return;
    }

    const requestBody = {
        contents: [{ parts: [{ text: `Generate a well-formatted Job/Internship Application Letter in a three-paragraph block format using the following resume and job description:\n\nResume:\n${resume}\n\nJob Description:\n${jobDescription}\n\nThe response should be a professional and structured formal cover letter with three distinct paragraphs: an introduction, a body highlighting relevant skills, and a conclusion with a call to action along with a signature. No extra comments or customization tips.` }] }]
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate the application letter.');
        }

        const data = await response.json();
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            outputDiv.innerHTML = data.candidates[0].content.parts[0].text; // Display the generated letter
        } else {
            outputDiv.innerHTML = 'Failed to generate the application letter. Please try again.';
        }
    } catch (error) {
        console.error('Error:', error);
        outputDiv.innerHTML = `An error occurred: ${error.message}`;
    }
}
