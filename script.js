let historyStack = [];
const MAX_HISTORY = 5;
let currentQuestions = [];
let currentQuestionIndex = -1;
let userResponses = {};
let selectedCategories = new Set();
let currentTest = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    timeLeft: 0,
    timer: null
};

// Add this object to store the topics for each category
const categoryTopics = {
    quantitative: [
        "Percentage",
        "Ratio and Proportion",
        "Age Problems",
        "Partnership",
        "Allegations and Mix",
        "Average",
        "Time and Work",
        "Pipes and Cistern",
        "Profit and Loss",
        "Probability",
        "Simple and Compound Interest",
        "Chain Rule",
        "Train Problems",
        "Boats and Streams",
        "Permutation and Combination",
        "Number System",
        "HCF and LCM",
        "Data Interpretation"
    ],
    verbal: [
        "Reading Comprehension",
        "Spotting Errors",
        "Sentence Formation",
        "Sentence Correction",
        "Synonym & Antonym",
        "Idioms and Phrases"
    ],
    logical: [
        "Seating Arrangement",
        "Clock Problems",
        "Calendar",
        "Blood Relations",
        "Directions",
        "Number Series",
        "Word Pattern",
        "Coding Decoding",
        "Mathematical Operations",
        "Venn Diagram",
        "Visual Reasoning",
        "Paper Cutting and Folding",
        "Cubes and Dices",
        "Data Sufficiency",
        "Statement and Assumption",
        "Statement and Conclusion"
    ]
};

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
  if (emailContent) emailContent.style.display = "none";
  if (aptitudeContent) aptitudeContent.style.display = "none";

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
                        const firstLine = item.content.split('\n')[0];
                        // Get letter type from content
                        const letterType = item.content.includes('Letter of Recommendation') ? 'LOR' :
                                         item.content.includes('Statement of Purpose') ? 'SOP' :
                                         item.content.includes('Cover Letter') ? 'Cover Letter' :
                                         item.content.includes('General Letter to') ? 'General Letter' :
                                         'Job Application';
                        
                        // Format the timestamp
                        const timestamp = new Date(item.timestamp).toLocaleString();
                        
                        return `
                    <div class="history-item">
                                <div class="history-item-header">
                                    <span class="history-type">${letterType}</span>
                                    <span class="history-timestamp">${timestamp}</span>
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
    const activeTab = document.querySelector('[id$="-content"]:not([style*="none"])')?.id;
    if (!activeTab) return;

    const outputDiv = activeTab.includes("job") ?
        document.getElementById("application-output") :
        document.getElementById("lor-output");

    if (outputDiv && historyStack[index]) {
        outputDiv.innerHTML = historyStack[index].content;
        document.querySelector(".dialog")?.remove();
    }
}

// Job Application Functions
async function generateLetter() {
    const spinner = document.querySelector(".loading-spinner");
    const letterTypeSelect = document.getElementById("template-style");
    const outputDiv = document.getElementById("letter-output");
    
    // Validate required elements exist
    if (!letterTypeSelect || !outputDiv || !spinner) {
        console.error("Required elements not found");
        return;
    }

    const letterType = letterTypeSelect.value;
    const apiKey = localStorage.getItem("geminiApiKey");
    
    if (!apiKey) {
        outputDiv.innerHTML = "Please add your API key first.";
        return;
    }
    
    document.getElementById("download-buttons").style.display = "none";
    spinner.style.display = "block";
  
    // Handle LOR fields if needed
    if (letterType === "lor") {
        const studentNameInput = document.getElementById("student-name");
        const recommenderNameInput = document.getElementById("recommender-name");
        const relationshipInput = document.getElementById("relationship");
        const coursesInput = document.getElementById("courses");
        const achievementsInput = document.getElementById("achievements");
        const purposeInput = document.getElementById("purpose");
        const lorTypeInput = document.getElementById("lor-type");
        
        // Validate LOR-specific inputs exist
        if (!studentNameInput || !recommenderNameInput || !relationshipInput || 
            !coursesInput || !achievementsInput || !purposeInput || !lorTypeInput) {
            outputDiv.innerHTML = "Error: LOR form elements not found. Please refresh the page.";
            spinner.style.display = "none";
            return;
        }

        const studentName = studentNameInput.value.trim();
        const recommenderName = recommenderNameInput.value.trim();
        const relationship = relationshipInput.value.trim();
        const courses = coursesInput.value.trim();
        const achievements = achievementsInput.value.trim();
        const purpose = purposeInput.value.trim();
        const lorType = lorTypeInput.value;
    
        if (!studentName || !recommenderName || !relationship) {
            outputDiv.innerHTML = "Please fill in all required fields.";
            spinner.style.display = "none";
            return;
        }

        const useResumeCheckbox = document.getElementById('use-resume');
        const useResume = useResumeCheckbox ? useResumeCheckbox.checked : false;
        const storedResume = useResume ? localStorage.getItem('userResume') : '';
    
        const requestData = {
            senderInfo: recommenderName,
            recipientInfo: studentName,
            context: `${relationship} - ${courses}`,
            keyPoints: useResume ? `${achievements}\n\nResume:\n${storedResume}` : achievements,
            purpose: purpose,
            type: lorType,
    };

    try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Generate a Letter of Recommendation with the following details:
                                    From: ${requestData.senderInfo} (Recommender)
                                    For: ${requestData.recipientInfo} (Candidate)
                                    Context: ${requestData.context}
                                    Key Achievements/Skills: ${requestData.keyPoints}
                                    Purpose: ${requestData.purpose}
                                    Type: ${requestData.type}
                                    
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
                                    - Formal academic/professional tone throughout`
                            }]
                        }]
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No response generated from API');
            }

            const outputText = data.candidates[0]?.content?.parts?.[0]?.text || "Failed to generate";
            const letterHeading = `Letter of Recommendation for ${requestData.recipientInfo} - ${requestData.type}`;
            
            outputDiv.innerHTML = `<h3 class="letter-heading">${letterHeading}</h3>\n\n${outputText}`;
            historyStack.push({
                content: `${letterHeading}\n\n${outputText}`,
                timestamp: new Date().toISOString(),
                type: letterType
            });
            if (historyStack.length > MAX_HISTORY) historyStack.shift();
            document.getElementById("download-buttons").style.display = "flex";
            
        } catch (error) {
            console.error("Error generating LOR:", error);
            outputDiv.innerHTML = `Error: ${error.message}. Please check your internet connection and API key.`;
        } finally {
            spinner.style.display = "none";
        }
        return;
    }
  
    // Handle all other letter types consistently
    const contextInput = document.getElementById("context-input");
    const keyPointsInput = document.getElementById("key-points-input");
    const senderInfoInput = document.getElementById("sender-info");
    const recipientInfoInput = document.getElementById("recipient-info");
    
    // Validate all required inputs exist
    if (!contextInput || !keyPointsInput || !senderInfoInput || !recipientInfoInput) {
        outputDiv.innerHTML = "Error: Required form elements not found. Please refresh the page.";
        spinner.style.display = "none";
        return;
    }

    const context = contextInput.value.trim();
    const keyPoints = keyPointsInput.value.trim();
    const senderInfo = senderInfoInput.value.trim();
    const recipientInfo = recipientInfoInput.value.trim();
  
    if (!context || !keyPoints || !senderInfo || !recipientInfo) {
        outputDiv.innerHTML = "Please fill in all required fields.";
        spinner.style.display = "none";
        return;
    }
  
    const useResumeCheckbox = document.getElementById('use-resume');
    const useResume = useResumeCheckbox ? useResumeCheckbox.checked : false;
    const storedResume = useResume ? localStorage.getItem('userResume') : '';
    
    let requestData = { 
        senderInfo, 
        recipientInfo, 
        context, 
        keyPoints: useResume ? `${keyPoints}\n\nResume:\n${storedResume}` : keyPoints,
        type: letterType === 'other' ? 'General Letter' : letterType.toUpperCase()
    };
  
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
        historyStack.push({
            content: `${letterHeading}\n\n${outputText}`,
            timestamp: new Date().toISOString(),
            type: letterType
        });
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
    historyStack.push({
        content: outputText,
        timestamp: new Date().toISOString(),
        type: 'lor'
    });
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
    
    // Set document properties
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Set margins (in mm)
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - (2 * margin);
    
    // Split text into lines that fit within margins
    const lines = doc.splitTextToSize(outputText, contentWidth);
    
    // Calculate lines per page (accounting for margins)
    const lineHeight = doc.getTextDimensions('test').h * 1.2;
    const linesPerPage = Math.floor((pageHeight - (2 * margin)) / lineHeight);
    
    // Add pages and text
    let currentPage = 1;
    for (let i = 0; i < lines.length; i += linesPerPage) {
        if (i > 0) {
            doc.addPage();
            currentPage++;
        }
        
        // Add page number at bottom
        doc.setFontSize(10);
        doc.text(`Page ${currentPage}`, pageWidth/2, pageHeight - 10, { align: 'center' });
        doc.setFontSize(12);
        
        // Add content for this page
        const pageLines = lines.slice(i, i + linesPerPage);
        doc.text(pageLines, margin, margin + (lineHeight/2));
    }
    
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
    
    // Set document properties
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Set margins (in mm)
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - (2 * margin);
    
    // Split text into lines that fit within margins
    const lines = doc.splitTextToSize(outputText, contentWidth);
    
    // Calculate lines per page (accounting for margins)
    const lineHeight = doc.getTextDimensions('test').h * 1.2;
    const linesPerPage = Math.floor((pageHeight - (2 * margin)) / lineHeight);
    
    // Add pages and text
    let currentPage = 1;
    for (let i = 0; i < lines.length; i += linesPerPage) {
        if (i > 0) {
            doc.addPage();
            currentPage++;
        }
        
        // Add page number at bottom
        doc.setFontSize(10);
        doc.text(`Page ${currentPage}`, pageWidth/2, pageHeight - 10, { align: 'center' });
        doc.setFontSize(12);
        
        // Add content for this page
        const pageLines = lines.slice(i, i + linesPerPage);
        doc.text(pageLines, margin, margin + (lineHeight/2));
    }
    
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
    const userResponseInput = document.getElementById("user-response-input");
    const responseTypeSelect = document.getElementById("response-type");
    const toneSelect = document.getElementById("response-tone");

    // Clear previous output and hide download buttons
    outputDiv.innerHTML = '';
    document.getElementById("email-download-buttons").style.display = "none";
    spinner.style.display = "block";

    // Validate inputs
    const originalEmail = originalEmailInput.value.trim();
    const userResponse = userResponseInput.value.trim();
    
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
                                    User's response: ${userResponse}
                                    Response Type: ${responseTypeSelect.value}
                                    Tone: ${toneSelect.value}

                                    Guidelines:
                                    1. Craft a professional and appropriate response
                                    2. Directly address the key points in the original email
                                    3. Incorporate the user's specific response points: ${userResponse}
                                    4. Match the response type and tone specified
                                    5. Keep the length concise and clear
                                    6. Use proper email formatting with salutation and signature
                                    
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
            historyStack.push({
                content: outputText,
                timestamp: new Date().toISOString(),
                type: 'email'
            });
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
    
    // Set document properties
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Set margins (in mm)
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - (2 * margin);
    
    // Split text into lines that fit within margins
    const lines = doc.splitTextToSize(outputText, contentWidth);
    
    // Calculate lines per page (accounting for margins)
    const lineHeight = doc.getTextDimensions('test').h * 1.2;
    const linesPerPage = Math.floor((pageHeight - (2 * margin)) / lineHeight);
    
    // Add pages and text
    let currentPage = 1;
    for (let i = 0; i < lines.length; i += linesPerPage) {
        if (i > 0) {
            doc.addPage();
            currentPage++;
        }
        
        // Add page number at bottom
        doc.setFontSize(10);
        doc.text(`Page ${currentPage}`, pageWidth/2, pageHeight - 10, { align: 'center' });
        doc.setFontSize(12);
        
        // Add content for this page
        const pageLines = lines.slice(i, i + linesPerPage);
        doc.text(pageLines, margin, margin + (lineHeight/2));
    }
    
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

function toggleCategory(category) {
    const card = document.querySelector(`.category-card[onclick*="${category}"]`);
    if (card) {
        if (selectedCategories.has(category)) {
            selectedCategories.delete(category);
            card.classList.remove('selected');
        } else {
            selectedCategories.add(category);
            card.classList.add('selected');
        }
    }
}

// Update the startTest function to clear previous content
async function startTest() {
    if (selectedCategories.size === 0) {
        alert('Please select at least one category');
        return;
    }

    const difficultyLevel = document.getElementById('difficulty-level').value;
    const questionCountInput = document.getElementById('question-count');
    const questionCount = parseInt(questionCountInput.value);

    // Validate question count
    if (isNaN(questionCount) || questionCount < 5 || questionCount > 50) {
        alert('Please enter a valid number of questions (between 5 and 50)');
        questionCountInput.focus();
        return;
    }

    const apiKey = localStorage.getItem("geminiApiKey");
    const spinner = document.querySelector("#aptitude-content .loading-spinner");
    
    try {
        // Clear previous test content
        const questionCounter = document.querySelector('.question-counter');
        const testQuestion = document.querySelector('.test-question');
        const testOptions = document.querySelector('.test-options');
        const nextButton = document.querySelector('.next-button');
        const submitButton = document.querySelector('.submit-button');
        const timerDisplay = document.querySelector('.timer');

        // Clear all previous content
        if (questionCounter) questionCounter.innerHTML = '';
        if (testQuestion) testQuestion.innerHTML = '';
        if (testOptions) testOptions.innerHTML = '';
        if (nextButton) nextButton.classList.add('hidden');
        if (submitButton) submitButton.classList.add('hidden');
        if (timerDisplay) timerDisplay.innerHTML = '';

        document.querySelector('.aptitude-controls').style.display = 'none';
        document.querySelector('.test-container').style.display = 'block';
        spinner.style.display = "block";

        // Create a timestamp to ensure uniqueness
        const timestamp = new Date().getTime();
        
        // Generate random seed numbers for each category
        const randomSeeds = {
            quantitative: Math.floor(Math.random() * 1000),
            verbal: Math.floor(Math.random() * 1000),
            logical: Math.floor(Math.random() * 1000)
        };

        // Create variations for each category's questions
        const variations = {
            quantitative: {
                valueRanges: [
                    "Use numbers between 100-999",
                    "Use numbers between 1000-9999",
                    "Use decimals between 0.1-99.9",
                    "Use percentages between 1%-100%"
                ],
                contextTypes: [
                    "business scenarios",
                    "daily life situations",
                    "scientific contexts",
                    "financial scenarios"
                ]
            },
            verbal: {
                textTypes: [
                    "technical articles",
                    "business communications",
                    "academic texts",
                    "general interest topics"
                ]
            },
            logical: {
                scenarios: [
                    "workplace scenarios",
                    "family relationships",
                    "spatial arrangements",
                    "temporal sequences"
                ]
            }
        };

        // Calculate questions per category
        const selectedCategoriesArray = Array.from(selectedCategories);
        const questionsPerCategory = Math.floor(questionCount / selectedCategoriesArray.length);
        const extraQuestions = questionCount % selectedCategoriesArray.length;

        // Create enhanced prompt with variations
        const topicDistribution = selectedCategoriesArray.map((category, index) => {
            const categoryQuestions = index < extraQuestions ? 
                questionsPerCategory + 1 : 
                questionsPerCategory;
            
            let categoryPrompt = `${category} (${categoryQuestions} questions): Choose from topics - ${categoryTopics[category].join(', ')}`;
            
            // Add category-specific variations
            if (category === 'quantitative') {
                categoryPrompt += `\nUse these variations:
                - Values: ${variations.quantitative.valueRanges[randomSeeds.quantitative % 4]}
                - Context: ${variations.quantitative.contextTypes[randomSeeds.quantitative % 4]}`;
            } else if (category === 'verbal') {
                categoryPrompt += `\nUse content from: ${variations.verbal.textTypes[randomSeeds.verbal % 4]}`;
            } else if (category === 'logical') {
                categoryPrompt += `\nUse scenarios from: ${variations.logical.scenarios[randomSeeds.logical % 4]}`;
            }
            
            return categoryPrompt;
        }).join('\n\n');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate a unique set of aptitude test questions (seed: ${timestamp}) with the following requirements:

                                Distribution:
                                ${topicDistribution}

                                Requirements:
                                1. Ensure all questions are unique and have not been used before
                                2. Use the specified variations for each category
                                3. Make questions appropriate for ${difficultyLevel} level
                                4. For quantitative questions:
                                   - Use different number ranges and scenarios
                                   - Vary the complexity of calculations
                                5. For verbal questions:
                                   - Use diverse vocabulary and contexts
                                   - Vary the complexity of language
                                6. For logical questions:
                                   - Use different patterns and scenarios
                                   - Vary the complexity of reasoning

                                Format as JSON:
                                {
                                    "questions": [
                                        {
                                            "category": "category name",
                                            "topic": "specific topic from the category",
                                            "question": "question text",
                                            "options": ["option1", "option2", "option3", "option4"],
                                            "correct": 0,
                                            "explanation": "detailed explanation of the solution",
                                            "difficulty": "${difficultyLevel}",
                                            "uniqueId": "timestamp_category_index"
                                        }
                                    ]
                                }`
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        const cleanJSON = textResponse.replace(/```json/g, '').replace(/```/g, '');
        const testData = JSON.parse(cleanJSON);

        currentTest = {
            questions: testData.questions,
            currentQuestionIndex: 0,
            score: 0,
            timeLeft: questionCount * 60, // 1 minute per question
            timer: null
        };

        startTimer();
        showQuestion();

    } catch (error) {
        console.error("Error starting test:", error);
        alert('Error generating test questions. Please try again.');
        document.querySelector('.aptitude-controls').style.display = 'block';
        document.querySelector('.test-container').style.display = 'none';
    } finally {
        spinner.style.display = "none";
    }
}

function startTimer() {
    const timerDisplay = document.querySelector('.timer');
    currentTest.timer = setInterval(() => {
        currentTest.timeLeft--;
        const minutes = Math.floor(currentTest.timeLeft / 60);
        const seconds = currentTest.timeLeft % 60;
        timerDisplay.textContent = `Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (currentTest.timeLeft <= 0) {
            clearInterval(currentTest.timer);
            submitTest();
        }
    }, 1000);
}

function showQuestion() {
    const question = currentTest.questions[currentTest.currentQuestionIndex];
    
    const questionCounter = document.querySelector('.question-counter');
    const testQuestion = document.querySelector('.test-question');
    const testOptions = document.querySelector('.test-options');
    const nextButton = document.querySelector('.next-button');
    const submitButton = document.querySelector('.submit-button');

    questionCounter.innerHTML = `
        <div class="counter-container">
            <span class="question-number">Question ${currentTest.currentQuestionIndex + 1} of ${currentTest.questions.length}</span>
            <div class="question-tags">
                <span class="category-tag">${question.category}</span>
                <span class="topic-tag">${question.topic}</span>
            </div>
        </div>
    `;

    testQuestion.textContent = question.question;

    const optionsHtml = question.options.map((option, index) => `
        <label class="option-label">
            <div class="option-content">
                <input type="radio" name="answer" value="${index}">
                <span class="option-text">${option}</span>
            </div>
        </label>
    `).join('');

    testOptions.innerHTML = optionsHtml;

    // Show next or submit button based on question number
    nextButton.classList.toggle('hidden', currentTest.currentQuestionIndex === currentTest.questions.length - 1);
    submitButton.classList.toggle('hidden', currentTest.currentQuestionIndex !== currentTest.questions.length - 1);
}

function nextQuestion() {
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (!selectedAnswer) {
        alert('Please select an answer');
        return;
    }

    // Store the user's response
    userResponses[currentTest.currentQuestionIndex] = parseInt(selectedAnswer.value);

    currentTest.currentQuestionIndex++;
    showQuestion();
}

function submitTest() {
    // First capture the last answer if selected
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (selectedAnswer) {
        userResponses[currentTest.currentQuestionIndex] = parseInt(selectedAnswer.value);
    }

    clearInterval(currentTest.timer);
    
    // Calculate score
    currentTest.score = Object.entries(userResponses).reduce((score, [index, answer]) => {
        return score + (answer === currentTest.questions[index].correct ? 1 : 0);
    }, 0);

    // Show results
    document.querySelector('.test-container').style.display = 'none';
    const resultsContainer = document.querySelector('.results-container');
    resultsContainer.classList.remove('hidden');

    document.getElementById('score').textContent = currentTest.score;
    document.getElementById('total').textContent = currentTest.questions.length;

    // Add legend for review
    const legendHtml = `
        <div class="review-legend">
            <div class="legend-item">
                <span class="legend-color correct"></span>
                <span>Correct Answer</span>
            </div>
            <div class="legend-item">
                <span class="legend-color incorrect"></span>
                <span>Your Answer (if incorrect)</span>
            </div>
        </div>
    `;

    // Show review of questions with improved answer highlighting
    const reviewHtml = currentTest.questions.map((q, index) => `
        <div class="review-question">
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <div class="question-tags">
                    <span class="category-tag">${q.category}</span>
                    <span class="topic-tag">${q.topic}</span>
                </div>
            </div>
            <div class="question-text">${q.question}</div>
            <div class="review-options">
                ${q.options.map((option, i) => {
                    const isUserAnswer = i === userResponses[index];
                    const isCorrectAnswer = i === q.correct;
                    return `
                        <div class="review-option ${isUserAnswer ? 'selected' : ''} ${isCorrectAnswer ? 'correct' : ''}">
                            ${option}
                            ${isUserAnswer && !isCorrectAnswer ? '<span class="incorrect-marker">✗</span>' : ''}
                            ${isCorrectAnswer ? '<span class="correct-marker">✓</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="explanation">
                <strong>Explanation:</strong> ${q.explanation}
            </div>
        </div>
    `).join('');

    document.querySelector('.review-questions').innerHTML = legendHtml + reviewHtml;
}

function restartTest() {
    // Reset test state
    selectedCategories.clear();
    currentTest = {
        questions: [],
        currentQuestionIndex: 0,
        score: 0,
        timeLeft: 0,
        timer: null
    };
    userResponses = {};

    // Reset UI
    document.querySelectorAll('.category-card').forEach(card => card.classList.remove('selected'));
    document.querySelector('.results-container').classList.add('hidden');
    document.querySelector('.test-container').style.display = 'none';
    document.querySelector('.aptitude-controls').style.display = 'block';
}

function showMainApp() {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Check for API key and show appropriate content
    const storedApiKey = localStorage.getItem("geminiApiKey");
    const resumeButton = document.querySelector(".resume-button");
    
    if (storedApiKey) {
        document.querySelector(".api-key-button").style.display = "none";
        document.getElementById("api-key-message").style.display = "none";
        document.getElementById("application-tabs").style.display = "block";
        resumeButton.style.display = "block";
        showTab("letter");
    } else {
        resumeButton.style.display = "none";
    }
}