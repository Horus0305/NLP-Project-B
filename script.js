let historyStack = [];
const MAX_HISTORY = 5;
let currentQuestions = [];
let currentQuestionIndex = -1;
let userResponses = {};

// Shared Functions
function openDialog() {
  document.getElementById("api-key-dialog").style.display = "block";
  const apiKey = document.getElementById("api-key-input").value;
  const message = document.getElementById("api-key-message");
  message.style.display = apiKey ? "none" : "block";
}

function closeDialog() {
  document.getElementById("api-key-dialog").style.display = "none";
}

function saveApiKey() {
  const apiKey = document.getElementById("api-key-input").value.trim();
  const message = document.getElementById("api-key-message");
  const apiKeyButton = document.querySelector(".api-key-button");
  const resumeButton = document.querySelector(".resume-button");

  if (apiKey) {
    localStorage.setItem("geminiApiKey", apiKey);
    message.style.display = "none";
    document.getElementById("application-tabs").style.display = "block";
    apiKeyButton.style.display = "none";
    resumeButton.style.display = "block";
    closeDialog();
    showTab("letter");
  } else {
    message.style.display = "block";
    alert("Please enter a valid API Key.");
  }
}

function showTab(tab) {
  const jobContent = document.getElementById("job-application-content");
  const resumeContent = document.getElementById("resume-content");
  const emailContent = document.getElementById("email-content");
  const aptitudeContent = document.getElementById("aptitude-content");
  const tabContent = document.getElementById("tab-content");
  const tabs = document.querySelectorAll(".tab-button");

  // Remove active class from all tabs
  tabs.forEach((t) => t.classList.remove("active"));

  // Add active class to clicked tab
  const activeTab = document.querySelector(`.tab-button[onclick*="${tab}"]`);
  if (activeTab) {
    activeTab.classList.add("active");
  }

  // Hide all content sections
  jobContent.style.display = "none";
  resumeContent.style.display = "none";
  emailContent.style.display = "none";
  aptitudeContent.style.display = "none";

  // Show selected tab content
  if (tab === "letter") {
    tabContent.style.display = "block";
    jobContent.style.display = "block";
  } else if (tab === "resume") {
    tabContent.style.display = "block";
    resumeContent.style.display = "block";
    // Auto-fill resume text if available
    const storedResume = localStorage.getItem('userResume');
    const resumeTextArea = document.getElementById('resume-text');
    if (storedResume && resumeTextArea) {
        resumeTextArea.value = storedResume;
    }
  } else if (tab === "email") {
    tabContent.style.display = "block";
    emailContent.style.display = "block";
  } else if (tab === "aptitude") {
    tabContent.style.display = "block";
    aptitudeContent.style.display = "block";
  }
}

function enableEditing(elementId = 'letter-output') {
    const outputDiv = document.getElementById(elementId);
    if (outputDiv) {
        outputDiv.contentEditable = true;
        outputDiv.style.border = '2px solid var(--primary-color)';
        outputDiv.focus();
        outputDiv.style.backgroundColor = '#fafafa';
        outputDiv.style.padding = '2rem';
        
        // Add instruction
        const instruction = document.createElement('div');
        instruction.className = 'edit-instruction';
        instruction.textContent = 'You can now edit the text. Click outside to finish editing.';
        outputDiv.parentNode.insertBefore(instruction, outputDiv);

        // Handle clicking outside
        function handleClickOutside(event) {
            if (!outputDiv.contains(event.target)) {
                outputDiv.contentEditable = false;
                outputDiv.style.border = '2px solid var(--border-color)';
                outputDiv.style.backgroundColor = 'var(--card-bg)';
                outputDiv.style.padding = '1.5rem';
                // Remove the instruction
                const instruction = document.querySelector('.edit-instruction');
                if (instruction) {
                    instruction.remove();
                }
                // Remove the event listener
                document.removeEventListener('click', handleClickOutside);
            }
        }

        // Add the event listener with a slight delay to prevent immediate triggering
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }
}

// History Management
function showHistory() {
    const historyDialog = document.createElement('div');
    historyDialog.innerHTML = `
        <div class="dialog history-dialog" style="display: block;">
            <div class="dialog-content history-content">
                <span class="close" onclick="this.closest('.dialog').remove()">&times;</span>
                <h2>Recent Generations</h2>
                <div class="history-list">
                    ${historyStack.map((item, i) => {
                        // Extract first line as title
                        const firstLine = item.split('\n')[0];
                        // Get letter type from content
                        const letterType = item.includes('Letter of Recommendation') ? 'LOR' :
                                         item.includes('Statement of Purpose') ? 'SOP' :
                                         item.includes('Cover Letter') ? 'Cover Letter' :
                                         item.includes('General Letter to') ? 'General Letter' : // Add this line
                                        'Job Application';
                        
                        return `
                            <div class="history-item">
                                <div class="history-item-header">
                                    <span class="history-type">${letterType}</span>
                                    <span class="history-number">#${historyStack.length - i}</span>
                                </div>
                                <div class="history-preview">${firstLine}</div>
                                <button onclick="loadHistory(${i})" class="history-load-btn">Load</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(historyDialog);
}

function loadHistory(index) {
  const activeTab = document.querySelector(
    '[id$="-content"]:not([style*="none"])'
  ).id;
  const outputDiv = activeTab.includes("job")
    ? document.getElementById("application-output")
    : document.getElementById("lor-output");

  outputDiv.innerHTML = historyStack[index];
  document.querySelector(".dialog").remove();
}

// Job Application Functions
async function generateLetter() {
    const spinner = document.querySelector(".loading-spinner");
    const letterType = document.getElementById("template-style").value;
    const apiKey = localStorage.getItem("geminiApiKey");
    const outputDiv = document.getElementById("letter-output");
  
    document.getElementById("download-buttons").style.display = "none";
    spinner.style.display = "block";
  
    // Handle all letter types consistently
    const context = document.getElementById("context-input").value.trim();
    const keyPoints = document.getElementById("key-points-input").value.trim();
    const senderInfo = document.getElementById("sender-info").value.trim();
    const recipientInfo = document.getElementById("recipient-info").value.trim();
  
    if (!context || !keyPoints || !senderInfo || !recipientInfo) {
      outputDiv.innerHTML = "Please fill in all required fields.";
      spinner.style.display = "none";
      return;
    }
  
    const useResume = document.getElementById('use-resume')?.checked;
    const storedResume = useResume ? localStorage.getItem('userResume') : '';
    
    let requestData = { 
        senderInfo, 
        recipientInfo, 
        context, 
        keyPoints: useResume ? `${keyPoints}\n\nResume:\n${storedResume}` : keyPoints,
        type: letterType === 'other' ? 'General Letter' : letterType.toUpperCase()
    };
  
    // Special handling for LOR fields if needed
    if (letterType === "lor") {
      const studentName = document.getElementById("student-name").value.trim();
      const recommenderName = document.getElementById("recommender-name").value.trim();
      const relationship = document.getElementById("relationship").value.trim();
      const courses = document.getElementById("courses").value.trim();
      const achievements = document.getElementById("achievements").value.trim();
      const purpose = document.getElementById("purpose").value.trim();
      const lorType = document.getElementById("lor-type").value;
  
      if (!studentName || !recommenderName || !relationship) {
        outputDiv.innerHTML = "Please fill in all required fields.";
        spinner.style.display = "none";
        return;
      }
  
      requestData = {
        senderInfo: recommenderName,
        recipientInfo: studentName,
        context: `${relationship} - ${courses}`,
        keyPoints: useResume ? `${achievements}\n\nResume:\n${storedResume}` : achievements,
        purpose: purpose,
        type: lorType,
      };
    }
  
    const promptTemplates = {
      lor: `Generate a Letter of Recommendation with the following details:
              From: ${requestData.senderInfo} (Recommender)
              For: ${requestData.recipientInfo} (Candidate)
              Context: ${requestData.context}
              Key Achievements/Skills: ${requestData.keyPoints}
              
              Format requirements:
              - Professional letterhead with recommender's title and institution
              - Opening that establishes relationship with candidate and duration/context
              - Explanation of recommender's qualifications to evaluate the candidate
              - 2-3 specific examples that demonstrate candidate's exceptional qualities
              - Include detailed anecdotes with measurable outcomes/impact
              - Compare candidate to peers using specific percentiles or rankings when possible
              - Address relevant skills for the position/program the candidate is pursuing
              - Include both strengths and areas of growth (framed positively)
              - Strong concluding endorsement with level of enthusiasm clearly stated
              - Professional closing with contact information offer
              - 500-750 words in length
              - Formal academic/professional tone throughout
              
              Dont include any other text or comments`,
  
      job: `Generate a Job/Internship Application Letter with the following details:
              From: ${requestData.senderInfo}
              To: ${requestData.recipientInfo}
              Context: ${requestData.context} 
              Qualifications & Skills: ${requestData.keyPoints}
              
              Format requirements:
              - Professional tone
              - Clear statement of position and organization interest
              - Highlight most relevant achievements from the provided qualifications
              - Connect skills directly to position requirements mentioned in context
              - Provide specific examples of how your experience relates to the role
              - Express enthusiasm with specific reasons for interest
              - Strong closing with clear next steps
              - 400-600 words in length
              - Properly formatted with date, address blocks, and signature
              
              Dont include any other text or comments`,
  
      cover: `Generate a Cover Letter with the following details:
              From: ${requestData.senderInfo}
              To: ${requestData.recipientInfo}
              Context: ${requestData.context}
              Qualifications & Skills: ${requestData.keyPoints}
              
              Format requirements:
              - Attention-grabbing opening referencing the company or position
              - Concise highlighting of most relevant qualifications from Qualifications & Skills
              - Include specific achievements that directly match job requirements
              - Demonstrate understanding of the position needs mentioned in context
              - Professional but conversational tone
              - Compelling closing with clear interest in interview
              - 250-400 words in length
              - Properly formatted with date, address blocks, and signature
              
              Dont include any other text or comments`,
  
      sop: `Generate a Statement of Purpose with the following details:
              Applicant: ${requestData.senderInfo}
              Program/Institution: ${requestData.recipientInfo}
              Background: ${requestData.context}
              Goals & Achievements: ${requestData.keyPoints}
              
              Format requirements:
              - Engaging opening that conveys passion for the field
              - Personal and professional narrative showing intellectual development
              - Connect past experiences to specific aspects of the target program
              - Include specific academic achievements with measurable outcomes
              - Explain why this specific program/institution is the ideal fit
              - Clearly articulate short-term and long-term academic/career goals
              - Demonstrate knowledge of faculty research or program strengths
              - Address any unusual aspects of academic record if mentioned in background
              - Maintain professional yet authentic voice throughout
              - Compelling conclusion that reinforces fit and readiness
              - 800-1000 words in length
              
              Dont include any other text or comments`,
  
      other: `Generate a formal letter based on the following details:
              From: ${requestData.senderInfo}
              To: ${requestData.recipientInfo}
              Context: ${requestData.context}
              Key Details: ${requestData.keyPoints}
              
              Format requirements:
              - Proper formal letter structure with date and address blocks
              - Clear purpose stated in opening paragraph
              - Organized supporting details in body paragraphs
              - Professional tone appropriate for the context
              - Specific details from provided information
              - Proper closing with contact information
              - 200-400 words in length
              - Suitable for official correspondence
              
              Examples of acceptable letters:
              - Leave applications
              - Medical leave requests
              - Permission requests
              - Formal complaints
              - Resource requests
              - Academic appeals
              
              Dont include any other text or comments`
    };
  
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: promptTemplates[letterType] || promptTemplates["job"],
            },
          ],
        },
      ],
    };
  
    let letterHeading = '';
    if (letterType === 'lor') {
      letterHeading = `Letter of Recommendation for ${requestData.recipientInfo} - ${requestData.type}`;
    } else if (letterType === 'job') {
      letterHeading = `Job Application to ${requestData.recipientInfo}`;
    } else if (letterType === 'cover') {
      letterHeading = `Cover Letter for ${requestData.recipientInfo}`;
    } else if (letterType === 'sop') {
      letterHeading = `Statement of Purpose for ${requestData.recipientInfo}`;
    } else if (letterType === 'other') {
      letterHeading = `General Letter to ${requestData.recipientInfo}`;
    }
  
    try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );
      
        const data = await response.json();
        
        // Enhanced error handling
        if (!data.candidates || data.candidates.length === 0) {
          console.error("API response missing candidates:", data);
          outputDiv.innerHTML = `Error: No response generated. ${data.error ? data.error.message : 'Please check your API key and try again.'}`;
          spinner.style.display = "none";
          return;
        }
        
        const outputText = data.candidates[0]?.content?.parts?.[0]?.text || "Failed to generate";
      
        // Add heading to the output
        outputDiv.innerHTML = `<h3 class="letter-heading">${letterHeading}</h3>\n\n${outputText}`;
        historyStack.push(`${letterHeading}\n\n${outputText}`);
        if (historyStack.length > MAX_HISTORY) historyStack.shift();
        document.getElementById("download-buttons").style.display = "flex";
      } catch (error) {
        console.error("Error generating letter:", error);
        outputDiv.innerHTML = `Error: ${error.message}. Please check your internet connection and API key.`;
      } finally {
        spinner.style.display = "none";
      }
}

// LOR Functions
async function generateLOR() {
  const spinner = document.querySelector(".loading-spinner");
  const studentName = document.getElementById("student-name").value.trim();
  const recommenderName = document
    .getElementById("recommender-name")
    .value.trim();
  const relationship = document.getElementById("relationship").value.trim();
  const courses = document.getElementById("courses").value.trim();
  const achievements = document.getElementById("achievements").value.trim();
  const purpose = document.getElementById("purpose").value.trim();
  const apiKey = localStorage.getItem("geminiApiKey");
  const outputDiv = document.getElementById("lor-output");
  const lorType = document.getElementById("lor-type").value;

  document.getElementById("lor-download-buttons").style.display = "none";
  spinner.style.display = "block";

  if (!studentName || !recommenderName || !relationship) {
    outputDiv.innerHTML = "Please fill required fields";
    spinner.style.display = "none";
    return;
  }

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Write ${lorType} LOR for ${studentName} from ${recommenderName} (${relationship}) for ${purpose}.
                Courses: ${courses}
                Achievements: ${achievements}
                Include: Letterhead, relationship context, achievements, personal qualities, strong recommendation`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    const outputText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate";

    outputDiv.innerHTML = outputText;
    historyStack.push(outputText);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    document.getElementById("lor-download-buttons").style.display = "flex";
  } catch (error) {
    outputDiv.innerHTML = `Error: ${error.message}`;
  } finally {
    spinner.style.display = "none";
  }
}

// Download Functions
function downloadPDF() {
  const outputText = document.getElementById("letter-output").innerText;
  const doc = new jspdf.jsPDF();
  doc.setFontSize(12);
  doc.text(doc.splitTextToSize(outputText, 180), 10, 10);
  doc.save("generated-letter.pdf");
}

function downloadDOCX() {
  const outputText = document.getElementById("letter-output").innerText;
  const doc = new docx.Document({
    sections: [
      {
        children: [new docx.Paragraph(outputText)],
      },
    ],
  });
  docx.Packer.toBlob(doc).then((blob) => saveAs(blob, "generated-letter.docx"));
}

function downloadLorPDF() {
  const outputText = document.getElementById("lor-output").innerText;
  const doc = new jspdf.jsPDF();
  doc.setFontSize(12);
  doc.text(doc.splitTextToSize(outputText, 180), 10, 10);
  doc.save("recommendation-letter.pdf");
}

function downloadLorDOCX() {
  const outputText = document.getElementById("lor-output").innerText;
  const doc = new docx.Document({
    sections: [
      {
        children: [new docx.Paragraph(outputText)],
      },
    ],
  });
  docx.Packer.toBlob(doc).then((blob) =>
    saveAs(blob, "recommendation-letter.docx")
  );
}

// Add this function to handle input field changes
function updateInputFields() {
  const letterType = document.getElementById('template-style').value;
  const inputsContainer = document.querySelector('.letter-inputs');
  const outputDiv = document.getElementById('letter-output');
  const downloadButtons = document.getElementById('download-buttons');
  const storedResume = localStorage.getItem('userResume');
  
  // Clear the output and hide download buttons
  if (outputDiv) {
    outputDiv.innerHTML = '';
  }
  if (downloadButtons) {
    downloadButtons.style.display = 'none';
  }

  // Add resume checkbox HTML
  const resumeCheckboxHTML = storedResume ? `
      <div class="resume-checkbox-container">
          <label class="resume-checkbox-label">
              <input type="checkbox" id="use-resume" class="resume-checkbox">
              Use the Added Resume
          </label>
      </div>
  ` : '';

  // Define input fields for each letter type
  const inputFields = {
    lor: `
        ${resumeCheckboxHTML}
        <div class="input-row">
            <input type="text" id="student-name" placeholder="Student's Full Name">
            <input type="text" id="recommender-name" placeholder="Recommender's Name">
        </div>
        <div class="input-row">
            <input type="text" id="relationship" placeholder="Relationship (e.g., Professor)">
            <select id="lor-type">
                <option value="academic">Academic</option>
                <option value="professional">Professional</option>
                <option value="scholarship">Scholarship</option>
            </select>
        </div>
        <textarea id="courses" placeholder="Relevant courses/projects" rows="2"></textarea>
        <textarea id="achievements" placeholder="Key achievements and skills" rows="3"></textarea>
        <textarea id="purpose" placeholder="Purpose of recommendation" rows="2"></textarea>
    `,
    job: `
        ${resumeCheckboxHTML}
        <textarea id="context-input" placeholder="Enter job description and role details..." rows="3"></textarea>
        <textarea id="key-points-input" placeholder="Enter your relevant experience and qualifications..." rows="3"></textarea>
        <div class="input-row">
            <input type="text" id="sender-info" placeholder="Your name and contact information">
            <input type="text" id="recipient-info" placeholder="Company name and hiring manager details">
        </div>
    `,
    cover: `
        ${resumeCheckboxHTML}
        <textarea id="context-input" placeholder="Enter position details and company information..." rows="3"></textarea>
        <textarea id="key-points-input" placeholder="Enter your relevant skills and experiences..." rows="3"></textarea>
        <div class="input-row">
            <input type="text" id="sender-info" placeholder="Your name and contact information">
            <input type="text" id="recipient-info" placeholder="Hiring manager's name and title">
        </div>
    `,
    sop: `
        ${resumeCheckboxHTML}
        <textarea id="context-input" placeholder="Enter your academic background and research interests..." rows="3"></textarea>
        <textarea id="key-points-input" placeholder="Enter your achievements, goals, and motivation..." rows="3"></textarea>
        <div class="input-row">
            <input type="text" id="sender-info" placeholder="Your name and current institution">
            <input type="text" id="recipient-info" placeholder="Target program/university name">
        </div>
    `,
    other: `
        ${resumeCheckboxHTML}
        <textarea id="context-input" placeholder="Letter purpose (e.g., Leave application, Medical request)" rows="2"></textarea>
        <textarea id="key-points-input" placeholder="Key details (dates, reasons, supporting information)" rows="3"></textarea>
        <div class="input-row">
            <input type="text" id="sender-info" placeholder="Your name and position">
            <input type="text" id="recipient-info" placeholder="Recipient's name and title">
        </div>
    `,
  };

  // Update the input fields
  inputsContainer.innerHTML = inputFields[letterType];
}

// Initialization
window.onload = function() {
    // First handle API key check
    const storedApiKey = localStorage.getItem("geminiApiKey");
    const resumeButton = document.querySelector(".resume-button");
    
    if (storedApiKey) {
        document.querySelector(".api-key-button").style.display = "none";
        document.getElementById("api-key-message").style.display = "none";
        document.getElementById("application-tabs").style.display = "block";
        resumeButton.style.display = "block"; // Show resume button if API key exists
        showTab("letter");
    } else {
        resumeButton.style.display = "none"; // Hide resume button if no API key
    }

    // Add theme toggle button to navbar
    const navbar = document.querySelector('.navbar-buttons');
    if (!document.getElementById('theme-toggle')) {
        const themeToggleButton = document.createElement('button');
        themeToggleButton.id = 'theme-toggle';
        themeToggleButton.className = 'theme-toggle';
        themeToggleButton.setAttribute('aria-label', 'Toggle theme');
        themeToggleButton.onclick = toggleTheme;
        navbar.appendChild(themeToggleButton);
    }

    // Initialize theme
    initTheme();

    // Auto-fill resume text area if available
    const storedResume = localStorage.getItem('userResume');
    if (storedResume && document.getElementById('resume-text')) {
        document.getElementById('resume-text').value = storedResume;
    }

    // Initialize resume button state
    updateResumeButton();
    
    // Update input fields to show checkbox if resume exists
    updateInputFields();
};

window.onclick = function (event) {
  if (event.target === document.getElementById("api-key-dialog")) {
    closeDialog();
  }
};

// Change function name from startResumeAnalysis to analyzeResume
async function analyzeResume() {
    const resumeText = document.getElementById("resume-text").value.trim();
    if (!resumeText) {
        alert("Please paste your resume first");
        return;
    }

    const apiKey = localStorage.getItem("geminiApiKey");
    const spinner = document.querySelector("#resume-content .loading-spinner");
    const outputDiv = document.getElementById("resume-output");
    
    // Clear previous output and show loader
    outputDiv.innerHTML = '';
    spinner.style.display = "block";

    // Maximum number of retries
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Analyze this resume and generate interview preparation items:
                                    ${resumeText}

                                    Requirements:
                                    1. For each item provide:
                                        - Question type (Technical/Behavioral/Scenario)
                                        - Specific question
                                        - Concise answer (2-3 sentences)
                                        - 3-4 key bullet points
                                    2. Format response as valid JSON:
                                    {
                                        "items": [
                                            {
                                                "type": "question type",
                                                "question": "text",
                                                "answer": "2-3 sentence answer",
                                                "keyPoints": ["point1", "point2"]
                                            }
                                        ]
                                    }
                                    3. Focus on technical implementations and measurable outcomes
                                    4. Include specific tools/technologies mentioned in resume`
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) {
                // If it's a 503 error, retry after a delay
                if (response.status === 503) {
                    attempt++;
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                        continue;
                    }
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response structure from API');
            }

            const textResponse = data.candidates[0].content.parts[0].text;
            if (!textResponse) {
                throw new Error('Empty response from API');
            }

            const cleanJSON = textResponse.replace(/```json/g, '').replace(/```/g, '');
            
            try {
                const interviewData = JSON.parse(cleanJSON);
                if (!interviewData || !interviewData.items || !Array.isArray(interviewData.items)) {
                    throw new Error('Invalid JSON structure');
                }
                
                displayInterviewItems(interviewData.items);
                document.getElementById("interview-container").classList.remove("hidden");
                break; // Success! Exit the retry loop
            } catch (jsonError) {
                throw new Error(`Failed to parse response: ${jsonError.message}`);
            }

        } catch (error) {
            attempt++;
            if (attempt === maxRetries || error.message !== 'HTTP error! status: 503') {
                console.error("Error generating Q&A:", error);
                outputDiv.innerHTML = `
                    <div class="error-message">
                        ${attempt === maxRetries ? 
                            'Service is temporarily unavailable. Please try again in a few moments.' : 
                            'Error analyzing resume. Please try again.'}
                        <br>
                        <small style="display: block; margin-top: 0.5rem; color: #666;">
                            Error details: ${error.message}
                        </small>
                    </div>`;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }

    // Hide loader when done
    spinner.style.display = "none";
}

// Updated display function
function displayInterviewItems(items) {
  const container = document.getElementById("interview-questions");
  container.innerHTML = items.map((item, index) => `
    <div class="interview-question">
      <div class="question-header">
        <span class="question-type">${item.type}</span>
        <span class="question-number">Question ${index + 1}</span>
      </div>
      <div class="question-text">${item.question}</div>
      <div class="answer-section">
        <div class="answer-label">Sample Answer:</div>
        <div class="answer-text">${item.answer}</div>
        <div class="key-points">
          <div class="key-points-label">Key Points:</div>
          <ul class="key-points-list">
            ${item.keyPoints.map(kp => `<li>${kp}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `).join('');
}

// Update download function
function downloadInterviewPrep() {
  try {
      const items = Array.from(document.querySelectorAll('.interview-question')).map(q => {
          return {
              type: q.querySelector('.question-type')?.textContent || '',
              question: q.querySelector('.question-text')?.textContent || '',
              answer: q.querySelector('.answer-text')?.textContent || '',
              keyPoints: Array.from(q.querySelectorAll('.key-points-list li')).map(li => li.textContent)
          };
      });

      const doc = new jspdf.jsPDF();
      doc.setFontSize(16);
      doc.text("Interview Preparation Guide", 105, 20, { align: "center" });
      
      let yPos = 30;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;

      items.forEach((item, index) => {
          // Check for page break
          if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = margin;
          }

          // Question Type and Number
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(`[${item.type}] Question ${index + 1}:`, margin, yPos);
          yPos += 8;

          // Question Text
          doc.setFontSize(11);
          doc.setFont(undefined, 'normal');
          const questionLines = doc.splitTextToSize(item.question, 180);
          doc.text(questionLines, margin + 5, yPos);
          yPos += (questionLines.length * 7) + 10;

          // Answer Section
          doc.setFont(undefined, 'bold');
          doc.text("Answer:", margin, yPos);
          yPos += 7;
          
          doc.setFont(undefined, 'normal');
          const answerLines = doc.splitTextToSize(item.answer, 180);
          doc.text(answerLines, margin + 5, yPos);
          yPos += (answerLines.length * 7) + 10;

          // Key Points Section
          doc.setFont(undefined, 'bold');
          doc.text("Key Points:", margin, yPos);
          yPos += 7;
          
          doc.setFont(undefined, 'normal');
          item.keyPoints.forEach((kp, i) => {
              const bulletText = `• ${kp}`;
              const lines = doc.splitTextToSize(bulletText, 180);
              
              lines.forEach(line => {
                  if (yPos > pageHeight - 20) {
                      doc.addPage();
                      yPos = margin;
                  }
                  doc.text(line, margin + 5, yPos);
                  yPos += 7;
              });
              yPos += 2; // Space between bullets
          });

          yPos += 10; // Space between questions
      });

      doc.save("interview-prep-guide.pdf");
  } catch (error) {
      console.error('Download failed:', error);
      alert('Error generating PDF. Please check the console for details.');
  }
}

// Email Response Generator Function
async function generateEmailResponse() {
    const spinner = document.querySelector("#email-content .loading-spinner");
    const apiKey = localStorage.getItem("geminiApiKey");
    const outputDiv = document.getElementById("email-response-output");
    const originalEmailInput = document.getElementById("original-email-input");
    const responseTypeSelect = document.getElementById("response-type");
    const toneSelect = document.getElementById("response-tone");

    // Clear previous output and hide download buttons
    outputDiv.innerHTML = '';
    document.getElementById("email-download-buttons").style.display = "none";
    spinner.style.display = "block";

    // Validate input
    const originalEmail = originalEmailInput.value.trim();
    if (!originalEmail) {
        outputDiv.innerHTML = "Please paste the original email.";
        spinner.style.display = "none";
        return;
    }

    // Maximum number of retries
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Generate an email response with the following requirements:
                                    Original Email: ${originalEmail}
                                    Response Type: ${responseTypeSelect.value}
                                    Tone: ${toneSelect.value}

                                    Guidelines:
                                    1. Craft a professional and appropriate response
                                    2. Directly address the key points in the original email
                                    3. Match the response type and tone specified
                                    4. Keep the length concise and clear
                                    5. Use proper email formatting with salutation and signature
                                    
                                    Response Types:
                                    - Informative: Provide detailed information
                                    - Acknowledgment: Confirm receipt and next steps
                                    - Scheduling: Arrange meeting/call
                                    - Follow-up: Provide additional details
                                    - Courtesy: Polite and brief response

                                    Tone Options:
                                    - Professional: Formal, corporate language
                                    - Friendly: Warm, approachable
                                    - Neutral: Balanced, straightforward
                                    - Urgent: Emphasize importance
                                    
                                    Do not include any placeholders or extra text. Generate a complete, ready-to-send email response.`
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) {
                // If it's a 503 error, retry after a delay
                if (response.status === 503) {
                    attempt++;
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                        continue;
                    }
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response structure from API');
            }

            const outputText = data.candidates[0]?.content?.parts?.[0]?.text || "Failed to generate response";

            // Add some basic formatting to the email
            outputDiv.innerHTML = `
                <div class="email-response">
                    <div class="email-header">Email Response</div>
                    <pre class="email-content">${outputText}</pre>
                </div>
            `;

            // Update history
            historyStack.push(outputText);
            if (historyStack.length > MAX_HISTORY) historyStack.shift();

            // Show download buttons
            document.getElementById("email-download-buttons").style.display = "flex";
            break; // Success! Exit the retry loop

        } catch (error) {
            attempt++;
            if (attempt === maxRetries || error.message !== 'HTTP error! status: 503') {
                console.error("Error generating email response:", error);
                outputDiv.innerHTML = `
                    <div class="error-message">
                        ${attempt === maxRetries ? 
                            'Service is temporarily unavailable. Please try again in a few moments.' : 
                            'Error generating email response. Please try again.'}
                        <br>
                        <small style="display: block; margin-top: 0.5rem; color: #666;">
                            Error details: ${error.message}
                        </small>
                    </div>`;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }

    // Hide spinner when done
    spinner.style.display = "none";
}

// Download Email Response as PDF
function downloadEmailPDF() {
  const outputText = document.getElementById("email-response-output").innerText;
  const doc = new jspdf.jsPDF();
  doc.setFontSize(12);
  doc.text(doc.splitTextToSize(outputText, 180), 10, 10);
  doc.save("email-response.pdf");
}

// Download Email Response as DOCX
function downloadEmailDOCX() {
  const outputText = document.getElementById("email-response-output").innerText;
  const doc = new docx.Document({
      sections: [
          {
              children: [new docx.Paragraph(outputText)],
          },
      ],
  });
  docx.Packer.toBlob(doc).then((blob) => saveAs(blob, "email-response.docx"));
}

// Dark/Light Mode Functionality
function toggleTheme() {
  const htmlElement = document.documentElement;
  const isDarkMode = htmlElement.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  updateThemeToggleIcon(isDarkMode);
}

function updateThemeToggleIcon(isDarkMode) {
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.innerHTML = isDarkMode 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
}

// Update the initTheme function
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const htmlElement = document.documentElement;
    
    if (savedTheme === 'dark') {
        htmlElement.classList.add('dark-mode');
    } else {
        htmlElement.classList.remove('dark-mode');
    }

    // Ensure the toggle button exists and update its icon
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        updateThemeToggleIcon(savedTheme === 'dark');
    }
}

function openResumeDialog() {
    const dialog = document.getElementById('resume-dialog');
    const storedResume = localStorage.getItem('userResume');
    const resumeTextarea = document.getElementById('stored-resume');
    
    if (storedResume) {
        resumeTextarea.value = storedResume;
    }
    
    dialog.style.display = 'block';
}

function closeResumeDialog() {
    document.getElementById('resume-dialog').style.display = 'none';
}

function saveResume() {
    const resumeText = document.getElementById('stored-resume').value.trim();
    if (resumeText) {
        localStorage.setItem('userResume', resumeText);
        closeResumeDialog();
        updateResumeButton();
        
        // Update the current input fields to show checkbox
        updateInputFields();
        
        // Auto-fill resume analysis textarea if on the resume tab
        const resumeContent = document.getElementById('resume-content');
        const resumeAnalysisTextarea = document.getElementById('resume-text');
        if (resumeContent.style.display === 'block' && resumeAnalysisTextarea) {
            resumeAnalysisTextarea.value = resumeText;
        }
        
        // Show success message
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = 'Resume saved successfully!';
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 3000);
    } else {
        alert('Please enter your resume text.');
    }
}

// Add these functions
function updateResumeButton() {
    const resumeButton = document.querySelector('.resume-button');
    const hasResume = localStorage.getItem('userResume');
    
    if (hasResume) {
        resumeButton.textContent = 'Clear Resume';
        resumeButton.onclick = openConfirmDialog;
    } else {
        resumeButton.textContent = 'Add Resume';
        resumeButton.onclick = openResumeDialog;
    }
}

function openConfirmDialog() {
    document.getElementById('confirm-dialog').style.display = 'block';
}

function closeConfirmDialog() {
    document.getElementById('confirm-dialog').style.display = 'none';
}

function confirmClearResume() {
    localStorage.removeItem('userResume');
    closeConfirmDialog();
    updateResumeButton();
    
    // Update input fields to remove checkbox
    updateInputFields();
    
    // Clear the resume analysis textarea if it exists
    const resumeAnalysisTextarea = document.getElementById('resume-text');
    if (resumeAnalysisTextarea) {
        resumeAnalysisTextarea.value = '';
    }
    
    // Show success message
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = 'Resume cleared successfully!';
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
}

// Aptitude Test Variables
let currentTest = {
  categories: [],
  questions: [],
  currentQuestionIndex: 0,
  timeLeft: 0,
  timerInterval: null,
  score: 0
};

// Fetch Questions from Generative AI
async function generateQuestions() {
  const apiKey = localStorage.getItem("geminiApiKey");
  const spinner = document.querySelector(".loading-spinner");
  const categoriesSelected = currentTest.categories.join(", ");

  spinner.style.display = "block";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a set of 10 multiple-choice questions for an aptitude test covering the following categories: ${categoriesSelected}

              Requirements:
              1. Each question must have:
                 - A clear, concise question statement
                 - 4 answer options
                 - A correct answer
                 - A detailed explanation
              2. Format the response as valid JSON:
              {
                "questions": [
                  {
                    "category": "category_name",
                    "question": "Question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct": 0,  // Index of correct answer
                    "explanation": "Detailed explanation of the correct answer"
                  }
                ]
              }
              3. Ensure questions match the selected categories
              4. Mix difficulty levels
              5. Provide varied question types within each category`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    // Clean and parse JSON
    const cleanJSON = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJSON);

    // Validate and set questions
    if (parsedData.questions && parsedData.questions.length > 0) {
      currentTest.questions = parsedData.questions;
      initializeTest();
    } else {
      throw new Error("No questions generated");
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    alert("Failed to generate questions. Please try again.");
  } finally {
    spinner.style.display = "none";
  }
}

function toggleCategory(category) {
  const card = document.querySelector(`[onclick="toggleCategory('${category}')"]`);
  card.classList.toggle('selected');
  const index = currentTest.categories.indexOf(category);
  
  if (index === -1) {
    currentTest.categories.push(category);
  } else {
    currentTest.categories.splice(index, 1);
  }
}

function startTest() {
  if (currentTest.categories.length === 0) {
    alert("Please select at least one category");
    return;
  }

  // Generate questions via AI
  generateQuestions();
}

function initializeTest() {
  // Set up test
  currentTest.currentQuestionIndex = 0;
  currentTest.score = 0;
  currentTest.timeLeft = currentTest.questions.length * 60; // 1 minute per question
  
  document.querySelector('.aptitude-controls').style.display = 'none';
  document.querySelector('.test-container').style.display = 'block';
  
  startTimer();
  showQuestion();
}

function startTimer() {
  currentTest.timerInterval = setInterval(() => {
    currentTest.timeLeft--;
    const timerDisplay = document.querySelector('.timer');
    
    if (timerDisplay) {
      timerDisplay.textContent = 
        `Time Left: ${Math.floor(currentTest.timeLeft/60)}:${(currentTest.timeLeft%60).toString().padStart(2, '0')}`;
    }
    
    if (currentTest.timeLeft <= 0) {
      clearInterval(currentTest.timerInterval);
      submitTest();
    }
  }, 1000);
}

function showQuestion() {
  const question = currentTest.questions[currentTest.currentQuestionIndex];
  
  const optionsHtml = question.options.map((option, index) => `
    <label class="option-label">
      <input type="radio" name="answer" value="${index}">
      ${option}
    </label>
  `).join('');

  const questionCounter = document.querySelector('.question-counter');
  const testQuestion = document.querySelector('.test-question');
  const testOptions = document.querySelector('.test-options');
  const nextButton = document.querySelector('.next-button');
  const submitButton = document.querySelector('.submit-button');

  // Reset radio button selection
  const radioButtons = document.querySelectorAll('input[type="radio"]');
  radioButtons.forEach(radio => radio.checked = false);

  if (questionCounter) {
    questionCounter.textContent = 
      `Question ${currentTest.currentQuestionIndex + 1} of ${currentTest.questions.length}`;
  }

  if (testQuestion) {
    testQuestion.innerHTML = `
      <span class="category-tag">${question.category}</span>
      ${question.question}
    `;
  }

  if (testOptions) {
    testOptions.innerHTML = optionsHtml;
  }

  // Hide buttons initially
  if (nextButton) {
    nextButton.classList.add('hidden');
  }

  if (submitButton) {
    submitButton.classList.add('hidden');
  }
}

function nextQuestion() {
  currentTest.currentQuestionIndex++;
  
  if (currentTest.currentQuestionIndex < currentTest.questions.length) {
    showQuestion();
  } else {
    submitTest();
  }
}

function submitTest() {
  clearInterval(currentTest.timerInterval);
  
  const testContainer = document.querySelector('.test-container');
  const resultsContainer = document.querySelector('.results-container');
  const scoreElement = document.getElementById('score');
  const totalElement = document.getElementById('total');
  const reviewQuestions = document.querySelector('.review-questions');

  if (testContainer) {
    testContainer.style.display = 'none';
  }
  
  // Calculate score
  currentTest.questions.forEach((question, index) => {
    if (question.selected === question.correct) {
      currentTest.score++;
    }
  });

  // Show results
  if (resultsContainer) {
    resultsContainer.classList.remove('hidden');
  }

  if (scoreElement) {
    scoreElement.textContent = currentTest.score;
  }

  if (totalElement) {
    totalElement.textContent = currentTest.questions.length;
  }

  // Show review
  if (reviewQuestions) {
    const reviewHtml = currentTest.questions.map((question, index) => `
      <div class="review-question">
        <p class="category-tag">${question.category}</p>
        <p>${index + 1}. ${question.question}</p>
        <p class="correct-answer">
          Correct Answer: ${question.options[question.correct]}
        </p>
        <p class="explanation">Explanation: ${question.explanation}</p>
      </div>
    `).join('');
    
    reviewQuestions.innerHTML = reviewHtml;
  }
}

// Handle answer selection
document.addEventListener('click', (e) => {
  if (e.target.closest('.option-label')) {
    const selectedOption = e.target.closest('.option-label');
    const questionIndex = currentTest.currentQuestionIndex;
    const selectedAnswer = parseInt(selectedOption.querySelector('input').value);
    
    currentTest.questions[questionIndex].selected = selectedAnswer;
    
    // Show next or submit button based on current question
    const nextButton = document.querySelector('.next-button');
    const submitButton = document.querySelector('.submit-button');

    // Hide both buttons first
    if (nextButton) nextButton.classList.add('hidden');
    if (submitButton) submitButton.classList.add('hidden');

    // Show appropriate button based on question index
    if (currentTest.currentQuestionIndex === currentTest.questions.length - 1) {
      if (submitButton) {
        submitButton.classList.remove('hidden');
      }
    } else {
      if (nextButton) {
        nextButton.classList.remove('hidden');
      }
    }
  }
});

// Restart Test
function restartTest() {
  // Reset test state
  currentTest = {
    categories: [],
    questions: [],
    currentQuestionIndex: 0,
    timeLeft: 0,
    timerInterval: null,
    score: 0
  };

  // Hide results
  const resultsContainer = document.querySelector('.results-container');
  if (resultsContainer) {
    resultsContainer.classList.add('hidden');
  }

  // Show category selection
  const aptitudeControls = document.querySelector('.aptitude-controls');
  if (aptitudeControls) {
    aptitudeControls.style.display = 'block';
  }

  // Deselect all category cards
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.classList.remove('selected');
  });
}