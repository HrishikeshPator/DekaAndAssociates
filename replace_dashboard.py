import sys
import re

with open('public/dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace scripts
content = content.replace(
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
    '<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>\n    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>\n    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>'
)
content = content.replace(
    '<script src="js/config.js"></script>\n    <script src="js/supabase.js"></script>',
    '<script src="js/firebase-config.js"></script>\n    <script src="js/firebase-client.js"></script>'
)

pattern = re.compile(r'(<script src="js/firebase-client\.js"></script>\s*<script>)(.*?)(</script>\s*</body>)', re.DOTALL)

new_script = r'''
        // DOM Elements
        const loadingDiv = document.getElementById('loading');
        const addBusinessSection = document.getElementById('add-business-section');
        const dashboardSection = document.getElementById('dashboard-section');
        const bookingsList = document.getElementById('bookings-list');
        const modal = document.getElementById('booking-modal');
        const businessSelect = document.getElementById('business-select');
        const cancelAddBusinessBtn = document.getElementById('cancel-add-business');

        let currentUser = null;
        let userBusinesses = [];
        const db = firebase.database();

        // Dynamic Label Logic
        const roleRadios = document.querySelectorAll('input[name="role"]');
        roleRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isReferrer = e.target.value === 'referrer';
                document.getElementById('label-business-name').textContent = isReferrer ? "Client's Business Name / Entity Name" : "Business Name / Entity Name";
                document.getElementById('label-client-name').textContent = isReferrer ? "Client's Name" : "Client Name";
                document.getElementById('label-email').textContent = isReferrer ? "Client's Email Address" : "Email Address";
                document.getElementById('label-phone').textContent = isReferrer ? "Client's Phone Number" : "Phone Number";
                document.getElementById('label-details').textContent = isReferrer ? "Client's Business Details" : "Additional Details";

                const msg = document.getElementById('referral-commission-msg');
                if (isReferrer) {
                    msg.classList.remove('hidden');
                } else {
                    msg.classList.add('hidden');
                }
            });
        });

        // Fetch System Settings
        async function fetchReferralCommission() {
            try {
                const snapshot = await db.ref('settings/referral_commission').once('value');
                const val = snapshot.val();
                if (val) {
                    const display = document.getElementById('commission-rate-display');
                    if (display) display.textContent = `${val}%`;
                }
            } catch (err) {
                console.warn('Failed to fetch commission setting:', err);
            }
        }

        // Ensure Profile Exists
        async function ensureProfileExists() {
            try {
                const profileRef = db.ref('profiles/' + currentUser.uid);
                const snapshot = await profileRef.once('value');
                if (!snapshot.exists()) {
                    console.log('Profile missing. Creating one now...');
                    await profileRef.set({
                        email: currentUser.email,
                        full_name: currentUser.displayName || currentUser.email.split('@')[0]
                    });
                }
            } catch (err) {
                console.warn('Profile check failed:', err);
            }
        }

        // Initialize
        function initDashboard() {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    await ensureProfileExists();
                    fetchReferralCommission();

                    const emailInput = document.querySelector('input[name="email"]');
                    if (emailInput && currentUser.email) {
                        emailInput.value = currentUser.email;
                    }

                    await loadBusinesses();
                    loadingDiv.classList.add('hidden');

                    if (userBusinesses.length === 0) {
                        showAddBusiness(false);
                    } else {
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('mode') === 'refer') {
                            window.history.replaceState({}, document.title, window.location.pathname);
                            showAddBusiness(true);
                            const referRadio = document.querySelector('input[value="referrer"]');
                            if (referRadio) { 
                                referRadio.click(); 
                                referRadio.dispatchEvent(new Event('change')); 
                            }
                        } else {
                            showDashboard();
                            loadBookings();
                        }
                    }
                } else {
                    window.location.href = '/index.html';
                }
            });
        }

        async function loadBusinesses() {
            try {
                const snapshot = await db.ref('businesses').orderByChild('user_id').equalTo(currentUser.uid).once('value');
                const data = [];
                snapshot.forEach(child => {
                    data.push({ id: child.key, ...child.val() });
                });
                data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                userBusinesses = data;
            } catch (error) {
                console.warn('Could not load businesses', error);
                userBusinesses = [];
            }
        }

        // View Transitions
        function showAddBusiness(allowCancel = true) {
            dashboardSection.classList.add('hidden');
            addBusinessSection.classList.remove('hidden');
            if (allowCancel) {
                cancelAddBusinessBtn.classList.remove('hidden');
            } else {
                cancelAddBusinessBtn.classList.add('hidden');
            }
        }

        function showDashboard() {
            addBusinessSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
        }

        // Add Business Form Submit
        document.getElementById('business-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const submitBtn = e.target.querySelector('button[type="submit"]');

            submitBtn.innerText = 'Saving...';
            submitBtn.disabled = true;

            try {
                const newRef = await db.ref('businesses').push({
                    user_id: currentUser.uid,
                    name: data.business_name,
                    client_name: data.client_name,
                    type: data.role,
                    email: data.email,
                    phone: data.phone,
                    details: data.details,
                    created_at: new Date().toISOString()
                });

                await loadBusinesses();
                showDashboard();
                openBookingModal(newRef.key);
                e.target.reset();

            } catch (err) {
                console.error('Add Business Error:', err);
                alert('Failed to save business profile. Please try again.');
            } finally {
                submitBtn.innerText = 'Save Profile & Continue';
                submitBtn.disabled = false;
            }
        });

        // Booking Form Submit
        document.getElementById('booking-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            const selectedServices = [];
            document.querySelectorAll('input[name="services"]:checked').forEach((checkbox) => {
                selectedServices.push(checkbox.value);
            });

            if (selectedServices.length === 0) {
                alert('Please select at least one service.');
                return;
            }

            const businessId = formData.get('business_id');
            const notes = formData.get('notes');

            const business = userBusinesses.find(b => b.id === businessId);
            const businessName = business ? business.name : 'Unknown';

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Processing...';

            try {
                await db.ref('bookings').push({
                    user_id: currentUser.uid,
                    business_id: businessId,
                    business_name: businessName,
                    services: selectedServices,
                    status: 'Pending',
                    notes: notes,
                    created_at: new Date().toISOString()
                });

                closeBookingModal();
                e.target.reset();
                alert('Booking created successfully!');
                loadBookings();

            } catch (err) {
                console.error('Booking Error:', err);
                alert('Failed to create booking: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Confirm Booking';
            }
        });

        // Load Bookings
        async function loadBookings() {
            bookingsList.innerHTML = '<div class="p-8 text-center text-slate-500">Loading bookings...</div>';
            try {
                const snapshot = await db.ref('bookings').orderByChild('user_id').equalTo(currentUser.uid).once('value');
                const data = [];
                snapshot.forEach(child => {
                    const booking = child.val();
                    booking.id = child.key;
                    // match business
                    const biz = userBusinesses.find(b => b.id === booking.business_id);
                    if (biz) {
                        booking.businesses = biz;
                    }
                    data.push(booking);
                });
                data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                if (data.length === 0) {
                    bookingsList.innerHTML = `
                        <div class="p-8 text-center text-slate-500">
                            <span class="material-icons text-4xl mb-2 opacity-50">event_busy</span>
                            <p>No active bookings found.</p>
                            <button onclick="openBookingModal()" class="mt-4 text-primary font-bold hover:underline">Book your first service</button>
                        </div>
                    `;
                    return;
                }

                bookingsList.innerHTML = data.map(booking => {
                    const serviceDisplay = Array.isArray(booking.services)
                        ? booking.services.join(', ')
                        : booking.service || 'General Service';

                    const businessName = booking.businesses?.name || booking.business_name || 'Business Profile';
                    const isReferral = booking.businesses?.type === 'referrer';

                    let statusColor = 'bg-slate-100 text-slate-800';
                    if (booking.status === 'Pending') statusColor = 'bg-yellow-100 text-yellow-800';
                    if (booking.status === 'Accepted' || booking.status === 'Confirmed') statusColor = 'bg-green-100 text-green-800';
                    if (booking.status === 'Completed') statusColor = 'bg-blue-100 text-blue-800';
                    if (booking.status === 'Rejected') statusColor = 'bg-red-100 text-red-800';

                    return `
                    <div class="p-6 flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                        <div class="flex-1 w-full">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <span class="inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide rounded-full ${statusColor}">
                                    ${booking.status === 'Accepted' ? 'In Progress' : booking.status}
                                </span>
                                <span class="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                                    ${businessName}
                                </span>
                                ${isReferral ? `<span class="text-xs text-white font-bold px-2 py-0.5 bg-purple-600 rounded-full flex items-center gap-1">
                                    <span class="material-icons text-[10px]">handshake</span> Referral
                                </span>` : ''}
                            </div>
                            <h4 class="font-bold text-slate-900 text-lg md:text-base">${serviceDisplay}</h4>
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                                <span>Applied: ${new Date(booking.created_at).toLocaleDateString()}</span>
                                ${(booking.status === 'Accepted' || booking.status === 'Confirmed') && booking.expected_completion_date ? `
                                <span class="text-green-600 font-bold flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                    <span class="material-icons text-sm">event</span> Expected: ${new Date(booking.expected_completion_date).toLocaleDateString()}
                                </span>` : ''}
                            </div>
                        </div>
                        <div class="text-right hidden md:block">
                            <span class="material-icons text-slate-300">chevron_right</span>
                        </div>
                    </div>
                `}).join('');

            } catch (err) {
                console.error('Load Bookings Error:', err);
                bookingsList.innerHTML = '<div class="p-8 text-center text-red-500">Failed to load bookings. Ensure database tables are created.</div>';
            }
        }

        // Modal Logic
        function openBookingModal(preselectedBusinessId = null) {
            businessSelect.innerHTML = '<option value="">Select a Business...</option>';
            userBusinesses.forEach(biz => {
                const option = document.createElement('option');
                option.value = biz.id;
                option.textContent = biz.name;
                if (preselectedBusinessId && biz.id == preselectedBusinessId) {
                    option.selected = true;
                }
                businessSelect.appendChild(option);
            });
            const addOption = document.createElement('option');
            addOption.value = "ADD_NEW";
            addOption.textContent = "+ Add New Business Profile";
            addOption.className = "font-bold text-primary";
            businessSelect.appendChild(addOption);
            modal.classList.remove('hidden');
        }

        function closeBookingModal() {
            modal.classList.add('hidden');
        }

        function handleBusinessChange(select) {
            if (select.value === 'ADD_NEW') {
                closeBookingModal();
                showAddBusiness(true);
                select.value = "";
            }
        }

        window.addEventListener('load', initDashboard);
'''

# Use sub only if it matched, else we can do a normal replace to be safe.
# Actually let's use the pattern. If it doesn't match, we will just replace the whole script block.
new_content = pattern.sub(r'\1\n' + new_script + r'\n\3', content)

with open('public/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated dashboard.html successfully.')
