let historyStack = [];
const MAX_HISTORY = 5;

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
        jobContent.style.display = 'block';
    } else if (tab === 'lor') {
        tabContent.style.display = 'block';
        jobContent.style.display = 'none';
    }
}

function downloadPDF() {
    const outputText = document.getElementById('application-output').innerText;
    const doc = new jspdf.jsPDF();
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(outputText, 180);
    doc.text(splitText, 10, 10);
    doc.save('application-letter.pdf');
}

function downloadDOCX() {
    const outputText = document.getElementById('application-output').innerText;
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: [
                new docx.Paragraph({
                    children: [new docx.TextRun(outputText)]
                })
            ]
        }]
    });
    docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, "application-letter.docx");
    });
}

function enableEditing() {
    const outputDiv = document.getElementById('application-output');
    outputDiv.contentEditable = true;
    outputDiv.style.border = "2px solid #6366f1";
    outputDiv.focus();
}

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
    document.getElementById('application-output').innerHTML = historyStack[index];
    document.querySelector('.dialog').remove();
}

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
    
    if (!apiKey) {
        outputDiv.innerHTML = 'API Key is missing. Please add your API key first.';
        spinner.style.display = 'none';
        return;
    }

    const requestBody = {
        contents: [{ parts: [{ text: `Generate a ${templateStyle}-style well-formatted Job/Internship Application Letter in three paragraphs using:\n\nResume:\n${resume}\n\nJob Description:\n${jobDescription}\n\nResponse should be professional with three paragraphs: introduction, skills showcase, and conclusion with call to action.` }] }]
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error('Failed to generate letter');
        
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

// Keyword Analysis Functions
function analyzeKeywords() {
    const resumeText = document.getElementById('resume-input').value.toLowerCase();
    const jdText = document.getElementById('job-description-input').value.toLowerCase();
    const analysisDiv = document.getElementById('keyword-analysis');

    const resumeKeywords = findUniqueKeywords(resumeText);
    const jdKeywords = findUniqueKeywords(jdText);
    const matchingKeywords = [...new Set(resumeKeywords.filter(keyword => 
        jdKeywords.includes(keyword)
    ))];

    analysisDiv.innerHTML = `
        <div class="analysis-box">
            <h4>Resume Keywords (${resumeKeywords.length})</h4>
            <p>${resumeKeywords.slice(0, 15).join(', ')}</p>
        </div>
        <div class="analysis-box">
            <h4>JD Keywords (${jdKeywords.length})</h4>
            <p>${jdKeywords.slice(0, 15).join(', ')}</p>
        </div>
        <div class="analysis-box">
            <h4>Matching Keywords (${matchingKeywords.length})</h4>
            <p>${matchingKeywords.slice(0, 15).join(', ')}</p>
        </div>
    `;
}

function findUniqueKeywords(text) {
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'in', 'on', 'at'];
    return [...new Set(text
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word))
    )];
}

document.getElementById('resume-input').addEventListener('input', analyzeKeywords);
document.getElementById('job-description-input').addEventListener('input', analyzeKeywords);
