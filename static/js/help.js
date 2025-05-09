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

    // Configure marked.js to generate IDs for headings
    marked.setOptions({
      headerIds: true,
      headerPrefix: '', // Optional: add a prefix to IDs
    });

    const htmlContent = marked.parse(markdownText);

    // Extract headings and build a hierarchical structure
    const lines = markdownText.trim().split('\n');
    const headings = [];
    const headingRegex = /^(#+)\s*(.+)$/;
    let currentLevel = 0;
    let currentHierarchy = headings;

    console.log('Starting heading extraction and hierarchy building...');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim(); // Trim each line before matching
      console.log(`Processing line ${index + 1}: "${trimmedLine}"`);
      const match = trimmedLine.match(headingRegex);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/\s+/g, '-');

        const heading = { id: id, text: text, level: level, children: [] };
        console.log(`Matched heading: Level ${level}, Text: "${text}", ID: "${id}"`);

        if (level > currentLevel) {
          // Deeper level
          console.log(`Moving to deeper level from ${currentLevel} to ${level}`);
          if (currentHierarchy.length > 0) {
            const lastSibling = currentHierarchy[currentHierarchy.length - 1];
            lastSibling.children.push(heading);
            currentHierarchy = lastSibling.children;
            console.log('Added as child:', heading);
          } else {
             // Should not happen with valid markdown starting from #
             console.warn('Unexpected hierarchy structure: Deeper level with empty currentHierarchy.');
             headings.push(heading);
             currentHierarchy = headings;
             console.log('Added to root as deeper level:', heading);
          }
        } else if (level < currentLevel) {
          // Higher level
          console.log(`Moving to higher level from ${currentLevel} to ${level}`);
          let parentHierarchy = headings;
          // Navigate up the hierarchy
          for (let i = 1; i < level; i++) { // Corrected loop condition
             if (parentHierarchy.length > 0 && parentHierarchy[parentHierarchy.length - 1].children.length > 0) {
                parentHierarchy = parentHierarchy[parentHierarchy.length - 1].children;
             } else {
                console.warn(`Unexpected hierarchy structure: Cannot find parent for level ${level}.`);
                break; // Should not happen with valid markdown
             }
          }
          parentHierarchy.push(heading);
          currentHierarchy = parentHierarchy;
          console.log('Added to higher level:', heading);

        } else {
          // Same level
          console.log(`Staying at same level ${level}`);
          currentHierarchy.push(heading);
          console.log('Added to current level:', heading);
        }
        currentLevel = level;
        console.log('Current hierarchy:', currentHierarchy);
      } else {
        console.log('No heading match.');
      }
    });

    console.log('Heading extraction and hierarchy building complete. Resulting headings:', headings);


    // Function to build nested TOC HTML
    const buildTocHtml = (items) => {
      let html = '<ul>';
      items.forEach(item => {
        html += `<li class="level-${item.level}"><a href="#${item.id}">${item.text}</a>`;
        if (item.children.length > 0) {
          html += buildTocHtml(item.children);
        }
        html += '</li>';
      });
      html += '</ul>';
      return html;
    };


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

    // Create table of contents
    const tocNav = document.createElement('nav');
    tocNav.classList.add('help-toc');
    tocNav.innerHTML = buildTocHtml(headings);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('help-content');
    contentDiv.innerHTML = htmlContent;

    modalBody.appendChild(tocNav);
    modalBody.appendChild(contentDiv);


    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalOverlay.appendChild(modalContent);

    document.body.appendChild(modalOverlay);

    // Add click event listeners to TOC links for smooth scrolling
    tocNav.querySelectorAll('a').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = contentDiv.querySelector(`#${targetId}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      };
    });


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
