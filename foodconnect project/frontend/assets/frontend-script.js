const socket = io('http://localhost:5000');

// State
let donations = [];
let volunteers = [];
let donorChart, recipientChart, volunteerChart;
let isProcessingAssignment = false; // Flag to pause Socket.IO updates during assignment

// Modal functions
function showDonorForm() {
  console.log('Opening donor modal');
  const modal = document.getElementById('donorModal');
  if (!modal) {
    console.error('Donor modal not found in DOM');
    return;
  }
  modal.classList.remove('hidden');
  modal.querySelector('.modal-content').classList.remove('hidden');
}

function showRecipientView() {
  console.log('Opening recipient modal');
  forceRefreshDonations().then(() => {
    const modal = document.getElementById('recipientModal');
    if (!modal) {
      console.error('Recipient modal not found in DOM');
      return;
    }
    modal.classList.remove('hidden');
    modal.querySelector('.modal-content').classList.remove('hidden');
  }).catch(err => {
    console.error('Error opening recipient modal:', err);
    alert('Failed to load donations. Check console for details.');
  });
}

function showVolunteerForm() {
  console.log('Opening volunteer modal');
  const modal = document.getElementById('volunteerModal');
  if (!modal) {
    console.error('Volunteer modal not found in DOM');
    return;
  }
  modal.classList.remove('hidden');
  modal.querySelector('.modal-content').classList.remove('hidden');
}

function showRecipientContactModal(id) {
  console.log('Opening recipient contact modal for donation ID:', id);
  const form = document.getElementById('recipientContactForm');
  if (!form) {
    console.error('Recipient contact form not found in DOM');
    return;
  }
  form.dataset.donationId = id;
  const modal = document.getElementById('recipientContactModal');
  if (!modal) {
    console.error('Recipient contact modal not found in DOM');
    return;
  }
  modal.classList.remove('hidden');
  modal.querySelector('.modal-content').classList.remove('hidden');
}

async function showAssignmentView() {
  console.log('Opening assignment modal');
  try {
    await forceRefreshDonations();
    await renderAssignments();
    const modal = document.getElementById('assignmentModal');
    if (!modal) {
      console.error('Assignment modal not found in DOM');
      return;
    }
    modal.classList.remove('hidden');
    modal.querySelector('.modal-content').classList.remove('hidden');
  } catch (err) {
    console.error('Error opening assignment modal:', err);
    alert('Failed to load assignments. Check console for details.');
  }
}

function closeModal(id) {
  console.log('Closing modal:', id);
  const modal = document.getElementById(id);
  if (!modal) {
    console.error(`Modal with ID ${id} not found in DOM`);
    return;
  }
  modal.querySelector('.modal-content').classList.add('hidden');
  setTimeout(() => modal.classList.add('hidden'), 400);
}

// Form validation
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error(`Form with ID ${formId} not found in DOM`);
    return false;
  }
  let isValid = true;
  form.querySelectorAll('input[required], select[required]').forEach(input => {
    if (!input.value ||
        (input.type === 'email' && !input.value.includes('@')) ||
        (input.type === 'tel' && !/^[0-9]{10}$/.test(input.value)) ||
        (input.type === 'datetime-local' && !input.value)) {
      input.classList.add('error');
      isValid = false;
    } else {
      input.classList.remove('error');
    }
  });
  return isValid;
}

// Fetch donations
async function forceRefreshDonations(search = '') {
  try {
    console.log('Force refreshing donations');
    donations = [];
    const response = await fetch('http://localhost:5000/api/donations');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Raw fetch response:', data);
    donations = data.map(d => ({
      ...d,
      id: String(d._id)
    }));
    console.log('Normalized donations:', donations);
    if (search) renderDonations(search);
  } catch (err) {
    console.error('Error fetching donations:', err);
    throw err;
  }
}

// Fetch a single donation by ID
async function fetchDonationById(id) {
  try {
    console.log(`Fetching donation with ID: ${id}`);
    const response = await fetch(`http://localhost:5000/api/donations/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Fetched donation:', data);
    return {
      ...data,
      id: String(data._id)
    };
  } catch (err) {
    console.error(`Error fetching donation with ID ${id}:`, err);
    throw err;
  }
}

// Fetch pending donations directly from the backend
async function fetchPendingDonations() {
  try {
    console.log('Fetching pending (claimed) donations directly from backend');
    const response = await fetch('http://localhost:5000/api/donations');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const pending = data.filter(d => d.status === 'claimed').map(d => ({
      ...d,
      id: String(d._id)
    }));
    console.log('Pending donations from backend:', pending);
    return pending;
  } catch (err) {
    console.error('Error fetching pending donations:', err);
    throw err;
  }
}

// Render donations
function renderDonations(search = '') {
  const list = document.getElementById('donation-list');
  if (!list) {
    console.error('Donation list element not found in DOM');
    return;
  }
  list.innerHTML = '';
  const filtered = donations.filter(d =>
    d.status === 'available' &&
    (d.name.toLowerCase().includes(search.toLowerCase()) ||
     d.location.toLowerCase().includes(search.toLowerCase()) ||
     d.type.toLowerCase().includes(search.toLowerCase()))
  );
  if (filtered.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-center">No donations available.</p>`;
  }
  filtered.forEach(d => {
    const div = document.createElement('div');
    div.className = 'border border-gray-700 rounded-xl p-6 glass';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <h4 class="font-semibold text-lg text-gray-100">${d.name} (${d.quantity})</h4>
        <span class="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">${d.type}</span>
      </div>
      <p class="text-sm text-gray-400 my-3">From: ${d.location}</p>
      <p class="text-sm text-gray-400">Pickup by: ${d.pickup}</p>
      ${d.recipientLocation ? `<p class="text-sm text-gray-400">To: ${d.recipientLocation}</p>` : ''}
      <button onclick="showRecipientContactModal('${d.id}')" class="btn mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl text-sm font-semibold">Request Donation</button>
    `;
    list.appendChild(div);
  });
}

// Render assignments
async function renderAssignments() {
  const list = document.getElementById('assignment-list');
  if (!list) {
    console.error('Assignment list element not found in DOM');
    return;
  }
  list.innerHTML = '';

  let pending = [];
  try {
    pending = await fetchPendingDonations();
  } catch (err) {
    console.error('Failed to fetch pending donations:', err);
    list.innerHTML = `<p class="text-gray-400 text-center">Failed to load deliveries. Please try again.</p>`;
    return;
  }

  console.log('Rendering assignments, pending donations:', pending);

  if (pending.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-center">No deliveries available.</p>`;
    return;
  }

  pending.forEach(d => {
    console.log(`Rendering donation ID ${d.id}:`, {
      status: d.status,
      recipientPhone: d.recipientPhone,
      recipientLocation: d.recipientLocation
    });
    if (d.status !== 'claimed') {
      console.warn(`Donation ID ${d.id} is not in 'claimed' status: ${d.status}`);
      return;
    }
    const div = document.createElement('div');
    div.className = 'border border-gray-700 rounded-xl p-6 glass';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <h4 class="font-semibold text-lg text-gray-100">${d.name} (${d.quantity})</h4>
        <span class="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">${d.type}</span>
      </div>
      <p class="text-sm text-gray-400 my-3">From: ${d.location}</p>
      <p class="text-sm text-gray-400">To: ${d.recipientLocation || 'Unknown Location'}</p>
      <p class="text-sm text-gray-400">Contact: ${d.recipientPhone || 'No Phone Provided'} <i class="fas fa-copy copy-icon ml-2" onclick="copyPhoneNumber('${d.recipientPhone || ''}')"></i></p>
      <p class="text-sm text-gray-400">Pickup by: ${d.pickup}</p>
      <button onclick="acceptAssignment('${d.id}')" class="btn mt-4 w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-xl text-sm font-semibold">Accept Delivery</button>
    `;
    list.appendChild(div);
  });

  requestAnimationFrame(() => {
    list.style.display = 'none';
    list.offsetHeight;
    list.style.display = 'block';
  });
}

// Accept assignment with retry mechanism
async function acceptAssignment(id, retryCount = 1, maxRetries = 3) {
  console.log(`Accepting assignment for donation ID: ${id}, Retry attempt: ${retryCount}/${maxRetries}`);
  try {
    isProcessingAssignment = true;

    let donation = null;
    try {
      donation = await fetchDonationById(id);
    } catch (err) {
      console.error(`Failed to fetch donation with ID ${id}:`, err);
      if (retryCount < maxRetries) {
        console.log(`Retrying fetch for donation ID ${id}, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return await acceptAssignment(id, retryCount + 1, maxRetries);
      }
      throw new Error('Donation not found after retries. It may have been removed.');
    }

    console.log('Fetched donation for acceptance:', donation);

    if (!donation) {
      throw new Error('Donation not found.');
    }
    if (donation.status !== 'claimed') {
      console.error(`Donation ID ${id} is not in 'claimed' status: ${donation.status}`);
      if (retryCount < maxRetries) {
        console.log(`Retrying after delay, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return await acceptAssignment(id, retryCount + 1, maxRetries);
      }
      throw new Error(`Donation is no longer available (status: ${donation.status}). It may have been accepted by another volunteer or cancelled.`);
    }

    const response = await fetch(`http://localhost:5000/api/donations/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log('Accept response:', result);

    if (response.ok) {
      const list = document.getElementById('assignment-list');
      if (!list) {
        console.error('Assignment list element not found in DOM during acceptAssignment');
        return;
      }
      list.innerHTML = `
        <div class="border border-gray-700 rounded-xl p-6 glass">
          <h4 class="font-semibold text-lg text-gray-100">Delivery Accepted!</h4>
          <p class="text-sm text-gray-400 my-3">Food: ${donation.name} (${donation.quantity})</p>
          <p class="text-sm text-gray-400">From: ${donation.location}</p>
          <p class="text-sm text-gray-400">To: ${donation.recipientLocation || 'Unknown Location'}</p>
          <p class="text-sm text-gray-400">Contact: ${donation.recipientPhone || 'No Phone Provided'} <i class="fas fa-copy copy-icon ml-2" onclick="copyPhoneNumber('${donation.recipientPhone || ''}')"></i></p>
          <p class="text-sm text-gray-400">Pickup by: ${donation.pickup}</p>
        </div>
      `;
      await forceRefreshDonations();
      await updateDashboard();
      alert('Delivery accepted successfully!');
    } else {
      console.error('Accept error:', result);
      throw new Error(result.error);
    }
  } catch (err) {
    console.error('Error accepting assignment:', err.message);
    alert(`Error: ${err.message}`);
    await renderAssignments();
  } finally {
    isProcessingAssignment = false;
  }
}

// Form submissions
document.getElementById('donorForm').addEventListener('submit', async e => {
  e.preventDefault();
  console.log('Donor form submitted');
  if (!validateForm('donorForm')) {
    console.log('Donor form validation failed');
    return;
  }
  const formData = new FormData(e.target);
  const donation = {
    business: formData.get('business'),
    quantity: formData.get('quantity'),
    type: formData.get('type'),
    location: formData.get('location'),
    pickup: formData.get('pickup'),
    phone: formData.get('phone')
  };
  try {
    const response = await fetch('http://localhost:5000/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donation)
    });
    const result = await response.json();
    if (response.ok) {
      console.log('Donation submitted successfully:', result);
      alert('Donation submitted!');
      closeModal('donorModal');
      e.target.reset();
      await forceRefreshDonations();
      updateDashboard();
    } else {
      console.error('Donation submission error:', result);
      alert('Error: ' + result.error);
    }
  } catch (err) {
    console.error('Error submitting donation:', err);
    alert('Server error');
  }
});

document.getElementById('recipientContactForm').addEventListener('submit', async e => {
  e.preventDefault();
  console.log('Recipient contact form submitted');
  if (!validateForm('recipientContactForm')) {
    console.log('Recipient contact form validation failed');
    return;
  }
  const formData = new FormData(e.target);
  const donationId = e.target.dataset.donationId;
  const requestData = {
    phone: formData.get('phone'),
    location: formData.get('location')
  };
  console.log('Submitting recipient request:', requestData, 'for donation ID:', donationId);
  try {
    const response = await fetch(`http://localhost:5000/api/donations/${donationId}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    const result = await response.json();
    console.log('Request response:', result);
    if (response.ok) {
      console.log('Recipient request submitted successfully');
      alert('Request submitted!');
      closeModal('recipientContactModal');
      closeModal('recipientModal');
      e.target.reset();
      await forceRefreshDonations();
      updateDashboard();
    } else {
      console.error('Recipient request error:', result);
      alert('Error: ' + result.error);
    }
  } catch (err) {
    console.error('Error submitting request:', err);
    alert('Server error');
  }
});

document.getElementById('volunteerForm').addEventListener('submit', async e => {
  e.preventDefault();
  console.log('Volunteer form submitted');
  if (!validateForm('volunteerForm')) {
    console.log('Volunteer form validation failed');
    return;
  }
  const formData = new FormData(e.target);
  const volunteer = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone')
  };
  try {
    const response = await fetch('http://localhost:5000/api/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(volunteer)
    });
    const result = await response.json();
    if (response.ok) {
      console.log('Volunteer registration successful:', result);
      alert('Volunteer registered! Check assignments.');
      closeModal('volunteerModal');
      showAssignmentView();
      e.target.reset();
      updateDashboard();
    } else {
      console.error('Volunteer registration error:', result);
      alert('Error: ' + result.error);
    }
  } catch (err) {
    console.error('Error registering volunteer:', err);
    alert('Server error');
  }
});

// Initialize charts
function initializeCharts() {
  console.log('Initializing charts');
  const donorCtx = document.getElementById('donorChart')?.getContext('2d');
  if (!donorCtx) {
    console.error('Donor chart canvas not found in DOM');
    return;
  }
  donorChart = new Chart(donorCtx, {
    type: 'bar',
    data: {
      labels: ['Total', 'Avail', 'Claimed'],
      datasets: [{
        label: 'Donations',
        data: [0, 0, 0],
        backgroundColor: ['#16a34a', '#2F855A', '#D69E2E'],
        borderColor: ['#16a34a', '#2F855A', '#D69E2E'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 10, precision: 0 },
        x: { ticks: { font: { size: 10 } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#2d3748', titleColor: '#e5e7eb', bodyColor: '#e5e7eb', padding: 6 }
      }
    }
  });

  const recipientCtx = document.getElementById('recipientChart')?.getContext('2d');
  if (!recipientCtx) {
    console.error('Recipient chart canvas not found in DOM');
    return;
  }
  recipientChart = new Chart(recipientCtx, {
    type: 'doughnut',
    data: {
      labels: ['Req', 'Del'],
      datasets: [{
        data: [0, 0],
        backgroundColor: ['#2563eb', '#60a5fa'],
        borderColor: ['#2563eb', '#60a5fa'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e5e7eb', font: { size: 10 } } },
        tooltip: { backgroundColor: '#2d3748', titleColor: '#e5e7eb', bodyColor: '#e5e7eb', padding: 6 }
      }
    }
  });

  const volunteerCtx = document.getElementById('volunteerChart')?.getContext('2d');
  if (!volunteerCtx) {
    console.error('Volunteer chart canvas not found in DOM');
    return;
  }
  volunteerChart = new Chart(volunteerCtx, {
    type: 'bar',
    data: {
      labels: ['Reg', 'Pending'],
      datasets: [{
        label: 'Volunteers',
        data: [0, 0],
        backgroundColor: ['#d97706', '#facc15'],
        borderColor: ['#d97706', '#facc15'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, max: 10, precision: 0 },
        x: { ticks: { font: { size: 10 } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#2d3748', titleColor: '#e5e7eb', bodyColor: '#e5e7eb', padding: 6 }
      }
    }
  });
}

// Update dashboard
async function updateDashboard() {
  console.log('Updating dashboard');
  try {
    const response = await fetch('http://localhost:5000/api/dashboard');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Dashboard data:', data);
    const { totalDonations, availableDonations, claimedDonations, deliveredDonations, totalVolunteers, peopleHelped } = data;

    const donorTotal = document.getElementById('donor-total');
    const donorAvailable = document.getElementById('donor-available');
    const donorClaimed = document.getElementById('donor-claimed');
    const recipientRequested = document.getElementById('recipient-requested');
    const recipientDelivered = document.getElementById('recipient-delivered');
    const volunteerRegistered = document.getElementById('volunteer-registered');
    const volunteerDeliveries = document.getElementById('volunteer-deliveries');
    const peopleHelpedElement = document.getElementById('people-helped');

    if (!donorTotal || !donorAvailable || !donorClaimed || !recipientRequested || !recipientDelivered || !volunteerRegistered || !volunteerDeliveries || !peopleHelpedElement) {
      console.error('One or more dashboard elements not found in DOM');
      return;
    }

    donorTotal.textContent = `Total: ${totalDonations}`;
    donorAvailable.textContent = `Avail: ${availableDonations}`;
    donorClaimed.textContent = `Claimed: ${claimedDonations}`;
    recipientRequested.textContent = `Req: ${claimedDonations}`;
    recipientDelivered.textContent = `Del: ${deliveredDonations}`;
    volunteerRegistered.textContent = `Reg: ${totalVolunteers}`;
    volunteerDeliveries.textContent = `Pending: ${claimedDonations}`;
    peopleHelpedElement.innerHTML = `${peopleHelped.toLocaleString()}+ People Helped`;

    if (donorChart) {
      donorChart.data.datasets[0].data = [totalDonations, availableDonations, claimedDonations];
      donorChart.update();
    } else {
      console.error('Donor chart not initialized');
    }

    if (recipientChart) {
      recipientChart.data.datasets[0].data = [claimedDonations, deliveredDonations];
      recipientChart.update();
    } else {
      console.error('Recipient chart not initialized');
    }

    if (volunteerChart) {
      volunteerChart.data.datasets[0].data = [totalVolunteers, claimedDonations];
      volunteerChart.update();
    } else {
      console.error('Volunteer chart not initialized');
    }

    anime({
      targets: '.anime-scale-in',
      scale: [0.95, 1],
      opacity: [0, 1],
      easing: 'easeOutQuad',
      duration: 600,
      delay: anime.stagger(150)
    });
  } catch (err) {
    console.error('Error updating dashboard:', err);
    alert('Failed to update dashboard. Check console for details.');
  }
}

// Search functionality
document.getElementById('recipient-search').addEventListener('input', e => {
  console.log('Search input:', e.target.value);
  renderDonations(e.target.value);
});

// Mobile menu
document.getElementById('mobile-menu-button').addEventListener('click', () => {
  console.log('Toggling mobile menu');
  const menu = document.getElementById('mobile-menu');
  if (!menu) {
    console.error('Mobile menu not found in DOM');
    return;
  }
  menu.classList.toggle('hidden');
  menu.classList.toggle('active');
});

// Socket.IO listeners
socket.on('connect', () => {
  console.log('Socket.IO connected');
});

socket.on('newDonation', donation => {
  console.log('New donation received:', donation);
  donations.push({
    ...donation,
    id: String(donation._id)
  });
  renderDonations();
  updateDashboard();
});

socket.on('donationUpdate', async updatedDonation => {
  if (isProcessingAssignment) {
    console.log('Skipping donation update during assignment processing:', updatedDonation);
    return;
  }
  console.log('Received donation update:', updatedDonation);
  await forceRefreshDonations();
  renderDonations();
  renderAssignments();
  updateDashboard();
});

socket.on('newVolunteer', volunteer => {
  console.log('New volunteer received:', volunteer);
  volunteers.push(volunteer);
  updateDashboard();
});

// Initialize dashboard, charts, and animations
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing charts and dashboard');
  initializeCharts();
  updateDashboard();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        if (entry.target.id === 'dashboard') {
          anime({
            targets: '.anime-scale-in',
            scale: [0.95, 1],
            opacity: [0, 1],
            easing: 'easeOutQuad',
            duration: 600,
            delay: anime.stagger(150)
          });
        }
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('section, .fade-in').forEach(el => observer.observe(el));
});