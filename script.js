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

  if (apiKey) {
    localStorage.setItem("geminiApiKey", apiKey);
    message.style.display = "none";
    document.getElementById("application-tabs").style.display = "block";
    apiKeyButton.style.display = "none";
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
  const tabContent = document.getElementById("tab-content");
  const tabs = document.querySelectorAll(".tab-button");

  // Remove active class from all tabs
  tabs.forEach((t) => t.classList.remove("active"));

  // Add active class to clicked tab
  const activeTab = document.querySelector(`.tab-button[onclick*="${tab}"]`);
  if (activeTab) {
    activeTab.classList.add("active");
  }

  if (tab === "letter") {
    tabContent.style.display = "block";
    jobContent.style.display = "block";
    resumeContent.style.display = "none";
  } else if (tab === "resume") {
    tabContent.style.display = "block";
    jobContent.style.display = "none";
    resumeContent.style.display = "block";
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
  
    let requestData = { 
      senderInfo, 
      recipientInfo, 
      context, 
      keyPoints,
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
        keyPoints: achievements,
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
  
  // Clear the output and hide download buttons
  if (outputDiv) {
    outputDiv.innerHTML = '';
  }
  if (downloadButtons) {
    downloadButtons.style.display = 'none';
  }

  // Define input fields for each letter type
  const inputFields = {
    lor: `
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
            <textarea id="context-input" placeholder="Enter job description and role details..." rows="3"></textarea>
            <textarea id="key-points-input" placeholder="Enter your relevant experience and qualifications..." rows="3"></textarea>
            <div class="input-row">
                <input type="text" id="sender-info" placeholder="Your name and contact information">
                <input type="text" id="recipient-info" placeholder="Company name and hiring manager details">
            </div>
        `,
    cover: `
            <textarea id="context-input" placeholder="Enter position details and company information..." rows="3"></textarea>
            <textarea id="key-points-input" placeholder="Enter your relevant skills and experiences..." rows="3"></textarea>
            <div class="input-row">
                <input type="text" id="sender-info" placeholder="Your name and contact information">
                <input type="text" id="recipient-info" placeholder="Hiring manager's name and title">
            </div>
        `,
    sop: `
            <textarea id="context-input" placeholder="Enter your academic background and research interests..." rows="3"></textarea>
            <textarea id="key-points-input" placeholder="Enter your achievements, goals, and motivation..." rows="3"></textarea>
            <div class="input-row">
                <input type="text" id="sender-info" placeholder="Your name and current institution">
                <input type="text" id="recipient-info" placeholder="Target program/university name">
            </div>
        `,
    other: `
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
window.onload = function () {
  const storedApiKey = localStorage.getItem("geminiApiKey");
  if (storedApiKey) {
    document.querySelector(".api-key-button").style.display = "none";
    document.getElementById("api-key-message").style.display = "none";
    document.getElementById("application-tabs").style.display = "block";
    showTab("letter");
  }
};

window.onclick = function (event) {
  if (event.target === document.getElementById("api-key-dialog")) {
    closeDialog();
  }
};

async function startResumeAnalysis() {
    const resumeText = document.getElementById("resume-text").value.trim();
    if (!resumeText) {
        alert("Please paste your resume first");
        return;
    }

    const apiKey = localStorage.getItem("geminiApiKey");
    const spinner = document.querySelector(".loading-spinner");
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
                            text: `Analyze this resume and generate 5-8 specific follow-up questions to better understand their experience:
                            ${resumeText}
                            
                            Focus on:
                            1. Projects mentioned (methodologies, challenges, outcomes)
                            2. Skills listed (depth of knowledge, practical applications)
                            3. Career gaps or job changes
                            4. Leadership experiences
                            5. Technical implementations
                            6. Metrics and measurable outcomes
                            
                            Format as JSON array: {questions: ["question1", "question2", ...]}`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        const jsonResponse = JSON.parse(textResponse.replace(/```json/g, '').replace(/```/g, ''));
        currentQuestions = jsonResponse.questions;
        userResponses = {};
        
        showQuestion(0);
        document.getElementById("interview-container").classList.remove("hidden");
        document.getElementById("resume-output").innerHTML = "";

    } catch (error) {
        console.error("Error generating questions:", error);
        alert("Error generating questions. Please try again.");
    } finally {
        spinner.style.display = "none";
    }
}

function showQuestion(index) {
    const container = document.getElementById("interview-questions");
    currentQuestionIndex = index;
    
    container.innerHTML = `
        <div class="interview-question">
            <div class="question-header">
                <h4>Question ${index + 1} of ${currentQuestions.length}</h4>
                <span class="question-progress">${index + 1}/${currentQuestions.length}</span>
            </div>
            <div class="question-text">${currentQuestions[index]}</div>
            <textarea 
                class="question-input" 
                id="answer-${index}" 
                placeholder="Type your response here..."
                oninput="userResponses[${index}] = this.value"
            >${userResponses[index] || ''}</textarea>
        </div>
    `;

    document.getElementById("question-progress").textContent = `Question ${index + 1} of ${currentQuestions.length}`;
    updateNavigationButtons();
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    } else {
        generateFinalAnalysis();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

function updateNavigationButtons() {
    const nextButton = document.querySelector(".interview-navigation button:last-child");
    nextButton.textContent = currentQuestionIndex === currentQuestions.length - 1 
        ? "Generate Report" 
        : "Next Question";
}

async function generateFinalAnalysis() {
  const spinner = document.querySelector(".loading-spinner");
  const apiKey = localStorage.getItem("geminiApiKey");
  const resumeText = document.getElementById("resume-text").value.trim();
  spinner.style.display = "block";

  try {
      const qaPairs = currentQuestions.map((q, i) => 
          `Question: ${q}\nAnswer: ${userResponses[i] || 'No response'}\n`
      ).join('\n');

      const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  contents: [{
                      parts: [{
                          text: `Generate a moderately detailed career analysis report based on:
                          Resume: ${resumeText}
                          
                          Interview Responses:
                          ${qaPairs}
                          
                          Include these sections:
                          1. Executive Summary (brief overview of candidate's profile)
                          2. Key Strengths (3-4 bullet points with little long explanations)
                          3. Skills Analysis (categorize skills and provide little less assessment of each category)
                          4. Project Highlights (3-4 most significant projects with impact metrics)
                          5. Experience Insights (little long analysis of work experience and achievements)
                          6. Career Development Recommendations (4-5 actionable suggestions)
                          
                          Format with markdown headings, bullet points, and paragraphs.
                          The report should be moderately detailed (700-900 words) - not too brief but not exhaustive.
                          Focus on providing meaningful insights rather than just summarizing the resume.
                          
                          Format the final report with proper markdown (##, *, etc.) for readability.`
                      }]
                  }]
              })
          }
      );

      const data = await response.json();
      let analysis = data.candidates[0].content.parts[0].text;
      
      // Convert markdown to HTML
      analysis = analysis
          .replace(/^## (.*$)/gm, '<h3>$1</h3>')
          .replace(/^# (.*$)/gm, '<h2>$1</h2>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
      
      // Wrap lists in <ul> tags
      analysis = analysis.replace(/<li>(.*?)<\/li>/g, function(match) {
          return '<ul>' + match + '</ul>';
      }).replace(/<\/ul><ul>/g, '');
      
      // Replace double line breaks with paragraph tags
      analysis = analysis.replace(/\n\n/g, '</p><p>');
      
      document.getElementById("resume-output").innerHTML = `
          <div class="analysis-content">
              <h2>Career Analysis Report</h2>
              <div class="report-body"><p>${analysis}</p></div>
              <button onclick="downloadReport()" class="button">Download Report</button>
          </div>
      `;
      
      document.getElementById("interview-container").classList.add("hidden");

  } catch (error) {
      console.error("Error generating analysis:", error);
      alert("Error generating final analysis. Please try again.");
  } finally {
      spinner.style.display = "none";
  }
}

// Updated download function to handle the new HTML formatting
function downloadReport() {
  
  const reportElement = document.querySelector(".report-body");
  const reportTitle = "Career Analysis Report";

  const doc = new jspdf.jsPDF();
  
  doc.setFont("helvetica");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  
  doc.text(reportTitle, 105, 20, { align: "center" });

  const content = reportElement.innerHTML;

  function extractSections(content) {
    const sections = [];
    
    const headingMatches = content.match(/<h[2-3]>(.*?)<\/h[2-3]>/g) || [];
    
    let lastIndex = 0;
    headingMatches.forEach((match, index) => {
      const headingText = match.replace(/<\/?h[2-3]>/g, '');
      const startIndex = content.indexOf(match, lastIndex);
      let endIndex;
      
      if (index < headingMatches.length - 1) {
        endIndex = content.indexOf(headingMatches[index + 1], startIndex);
      } else {
        endIndex = content.length;
      }
      
      const sectionContent = content.substring(startIndex + match.length, endIndex);
      sections.push({
        heading: headingText,
        content: sectionContent.replace(/<\/?[^>]+(>|$)/g, ' ')
                               .replace(/&nbsp;/g, ' ')
                               .replace(/\s+/g, ' ')
                               .trim()
      });
      
      lastIndex = endIndex;
    });
    
    return sections;
  }
  
  const sections = extractSections(content);
  
  // Start Y position after title
  let yPosition = 30;
  const leftMargin = 15;
  const pageWidth = 180;
  
  // Add each section to PDF
  sections.forEach((section, index) => {
    // Add section heading
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.text(section.heading, leftMargin, yPosition);
    yPosition += 8;
    
    // Add section content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    // Handle bullet points
    const contentWithBullets = section.content.replace(/•/g, '\n• ');
    const paragraphs = contentWithBullets.split(/\n+/);
    
    paragraphs.forEach(paragraph => {
      const textLines = doc.splitTextToSize(paragraph.trim(), pageWidth);
      
      // Check if we need a new page for this paragraph
      if (yPosition + (textLines.length * 6) > 280) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(textLines, leftMargin, yPosition);
      yPosition += (textLines.length * 6) + 4;
    });
    
    // Add space between sections
    yPosition += 4;
  });
  
  // If there are no sections (empty content or parsing failed), add a fallback
  if (sections.length === 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    const textLines = doc.splitTextToSize(textContent, pageWidth);
    doc.text(textLines, leftMargin, yPosition);
  }
  
  // Save the PDF
  doc.save("career-analysis-report.pdf");
}
