let historyStack = [];
const MAX_HISTORY = 5;

// Shared Functions
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
        message.style.display = 'none';
        document.getElementById('application-tabs').style.display = 'block';
        apiKeyButton.style.display = 'none';
        showTab('job');
    } else {
        message.style.display = 'block';
        alert('Please enter a valid API Key.');
    }
}

function showTab(tab) {
    const jobContent = document.getElementById('job-application-content');
    const lorContent = document.getElementById('lor-content');
    const tabContent = document.getElementById('tab-content');

    if (tab === 'job') {
        tabContent.style.display = 'block';
        jobContent.style.display = 'block';
        lorContent.style.display = 'none';
    } else if (tab === 'lor') {
        tabContent.style.display = 'block';
        jobContent.style.display = 'none';
        lorContent.style.display = 'block';
    }
}

function enableEditing(elementId) {
    const outputDiv = document.getElementById(elementId);
    outputDiv.contentEditable = true;
    outputDiv.style.border = "2px solid #6366f1";
    outputDiv.focus();
}

// History Management
function showHistory() {
    const historyDialog = document.createElement('div');
    historyDialog.innerHTML = `
        <div class="dialog" style="display: block;">
            <div class="dialog-content">
                <h2>Recent Generations</h2>
                ${historyStack.map((text, i) => `
                    <div class="history-item">
                        ${text.substring(0, 50)}...
                        <button onclick="loadHistory(${i})" class="button">Load</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(historyDialog);
}

function loadHistory(index) {
    const activeTab = document.querySelector('[id$="-content"]:not([style*="none"])').id;
    const outputDiv = activeTab.includes('job') ? 
        document.getElementById('application-output') : 
        document.getElementById('lor-output');
    
    outputDiv.innerHTML = historyStack[index];
    document.querySelector('.dialog').remove();
}

// Job Application Functions
async function generateApplicationLetter() {
    const spinner = document.querySelector('.loading-spinner');
    const resume = document.getElementById('resume-input').value.trim();
    const jobDescription = document.getElementById('job-description-input').value.trim();
    const apiKey = localStorage.getItem('geminiApiKey');
    const outputDiv = document.getElementById('application-output');
    const templateStyle = document.getElementById('template-style').value;

    document.getElementById('download-buttons').style.display = 'none';
    spinner.style.display = 'block';

    if (!resume || !jobDescription) {
        outputDiv.innerHTML = 'Please enter both your resume and the job description.';
        spinner.style.display = 'none';
        return;
    }
    
    const requestBody = {
        contents: [{ parts: [{ text: `Generate ${templateStyle} cover letter using:\nResume:${resume}\nJob Desc:${jobDescription}\nStructure: 3 paragraphs - intro, skills, conclusion with call to action` }] }]
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate';
        
        outputDiv.innerHTML = outputText;
        historyStack.push(outputText);
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
        document.getElementById('download-buttons').style.display = 'flex';
    } catch (error) {
        outputDiv.innerHTML = `Error: ${error.message}`;
    } finally {
        spinner.style.display = 'none';
    }
}

// LOR Functions
async function generateLOR() {
    const spinner = document.querySelector('.loading-spinner');
    const studentName = document.getElementById('student-name').value.trim();
    const recommenderName = document.getElementById('recommender-name').value.trim();
    const relationship = document.getElementById('relationship').value.trim();
    const courses = document.getElementById('courses').value.trim();
    const achievements = document.getElementById('achievements').value.trim();
    const purpose = document.getElementById('purpose').value.trim();
    const apiKey = localStorage.getItem('geminiApiKey');
    const outputDiv = document.getElementById('lor-output');
    const lorType = document.getElementById('lor-type').value;

    document.getElementById('lor-download-buttons').style.display = 'none';
    spinner.style.display = 'block';

    if (!studentName || !recommenderName || !relationship) {
        outputDiv.innerHTML = 'Please fill required fields';
        spinner.style.display = 'none';
        return;
    }
    
    const requestBody = {
        contents: [{
            parts: [{
                text: `Write ${lorType} LOR for ${studentName} from ${recommenderName} (${relationship}) for ${purpose}.
                Courses: ${courses}
                Achievements: ${achievements}
                Include: Letterhead, relationship context, achievements, personal qualities, strong recommendation`
            }]
        }]
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate';
        
        outputDiv.innerHTML = outputText;
        historyStack.push(outputText);
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
        document.getElementById('lor-download-buttons').style.display = 'flex';
    } catch (error) {
        outputDiv.innerHTML = `Error: ${error.message}`;
    } finally {
        spinner.style.display = 'none';
    }
}

// Download Functions
function downloadPDF() {
    const outputText = document.getElementById('application-output').innerText;
    const doc = new jspdf.jsPDF();
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(outputText, 180), 10, 10);
    doc.save('cover-letter.pdf');
}

function downloadDOCX() {
    const outputText = document.getElementById('application-output').innerText;
    const doc = new docx.Document({
        sections: [{
            children: [new docx.Paragraph(outputText)]
        }]
    });
    docx.Packer.toBlob(doc).then(blob => saveAs(blob, "cover-letter.docx"));
}

function downloadLorPDF() {
    const outputText = document.getElementById('lor-output').innerText;
    const doc = new jspdf.jsPDF();
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(outputText, 180), 10, 10);
    doc.save('recommendation-letter.pdf');
}

function downloadLorDOCX() {
    const outputText = document.getElementById('lor-output').innerText;
    const doc = new docx.Document({
        sections: [{
            children: [new docx.Paragraph(outputText)]
        }]
    });
    docx.Packer.toBlob(doc).then(blob => saveAs(blob, "recommendation-letter.docx"));
}

// Initialization
window.onload = function() {
    const storedApiKey = localStorage.getItem('geminiApiKey');
    if (storedApiKey) {
        document.querySelector('.api-key-button').style.display = 'none';
        document.getElementById('api-key-message').style.display = 'none';
        document.getElementById('application-tabs').style.display = 'block';
        showTab('job');
    }
};

window.onclick = function(event) {
    if (event.target === document.getElementById('api-key-dialog')) {
        closeDialog();
    }
};
