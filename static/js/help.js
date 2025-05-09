// help.js
// This file will contain the JavaScript code for displaying help tooltips.

// Load marked.js and Tippy.js from CDN
const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

let helpSections = {};

const initializeHelp = async () => {
  // Fetch and parse help.md
  try {
    const response = await fetch('/static/parapara-help.md');
    const text = await response.text();
    helpSections = parseHelpMarkdown(text);
    console.log('Help sections loaded and parsed.');
  } catch (error) {
    console.error('Failed to fetch or parse help.md:', error);
  }

  // Initialize Tippy.js for elements with data-help-id
  tippy('[data-help-id]', {
    content: (reference) => {
      const helpId = reference.getAttribute('data-help-id');
      const section = helpSections[helpId];
      if (section) {
        return marked.parse(section);
      }
      return 'Help section not found.';
    },
    allowHTML: true,
    theme: 'light-border',
    placement: 'bottom',
    interactive: true,
    delay: [200, 0], // Add delay: [show, hide]
    appendTo: document.body, // Append tooltip to the body
    maxWidth: 800, // Set maximum width using Tippy.js option
  });
};

const parseHelpMarkdown = (markdownText) => {
  console.log('Parsing markdown text...');
  const sections = {};
  const lines = markdownText.trim().split('\n'); // Trim the whole text
  let currentId = null;
  let currentContent = [];

  for (const line of lines) {
    const trimmedLine = line.trim(); // Trim each line
    const sectionMatch = trimmedLine.match(/^##\s*(.+)$/);
    if (sectionMatch) {
      if (currentId && currentContent.length > 0) {
        sections[currentId] = currentContent.join('\n').trim();
      }
      currentId = sectionMatch[1].trim();
      currentContent = [];
      console.log(`Found section: ${currentId}`);
    } else if (currentId !== null) {
      currentContent.push(line); // Keep original line content for section body
    }
  }

  // Add the last section
  if (currentId && currentContent.length > 0) {
    sections[currentId] = currentContent.join('\n').trim();
  }
  console.log('Markdown parsing complete. Resulting sections:', sections);
  return sections;
};

// Function to show the full help content in a modal
const showFullHelp = async () => {
  try {
    const response = await fetch('/static/parapara-help.md');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const markdownText = await response.text();
    const htmlContent = marked.parse(markdownText);

    // Create modal elements
    const modalOverlay = document.createElement('div');
    modalOverlay.classList.add('help-modal-overlay');

    const modalContent = document.createElement('div');
    modalContent.classList.add('help-modal-content');

    const modalHeader = document.createElement('div');
    modalHeader.classList.add('help-modal-header');
    modalHeader.innerHTML = '<h2>Help Documentation</h2>';

    const closeButton = document.createElement('button');
    closeButton.classList.add('help-modal-close');
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
      document.body.removeChild(modalOverlay);
    };

    modalHeader.appendChild(closeButton);

    const modalBody = document.createElement('div');
    modalBody.classList.add('help-modal-body');
    modalBody.innerHTML = htmlContent;

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalOverlay.appendChild(modalContent);

    document.body.appendChild(modalOverlay);

  } catch (error) {
    console.error('Failed to show full help:', error);
    alert('Failed to load help documentation.');
  }
};


// Add event listener to the "Help" button after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const fullHelpButton = document.getElementById('show-full-help');
  console.log('Attempting to find button with ID "show-full-help":', fullHelpButton);
  if (fullHelpButton) {
    fullHelpButton.addEventListener('click', showFullHelp);
    console.log('"show-full-help" button found and event listener attached.');
  } else {
    console.log('"show-full-help" button not found.');
  }
});

loadScript('https://cdn.jsdelivr.net/npm/marked@4.0.10/marked.min.js')
  .then(() => loadScript('https://unpkg.com/@popperjs/core@2'))
  .then(() => loadScript('https://unpkg.com/tippy.js@6'))
  .then(() => {
    console.log('Marked.js and Tippy.js loaded.');
    // Initialize help functionality after libraries are loaded
    initializeHelp();
    // showFullHelp is now defined and marked is loaded, attach event listener
    const fullHelpButton = document.getElementById('show-full-help');
    if (fullHelpButton) {
      fullHelpButton.addEventListener('click', showFullHelp);
      console.log('"show-full-help" button event listener attached after library load.');
    }
  })
  .catch(error => {
    console.error('Failed to load libraries:', error);
  });
