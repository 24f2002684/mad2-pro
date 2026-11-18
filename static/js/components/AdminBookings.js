// static/js/components/AdminBookings.js
// Admin global bookings tracking and exceptional candidate rescheduling component.

const AdminBookings = {
    props: ["searchQuery"],
    data() {
        return {
            bookings: [],
            availableSlots: [],
            selectedBooking: null,
            newSlotId: "",
            loading: false,
            errorMessage: "",
            successMessage: ""
        };
    },
    computed: {
        filteredBookings() {
            if (!this.searchQuery) return this.bookings;
            const q = this.searchQuery.toLowerCase();
            return this.bookings.filter(b => 
                b.student_name.toLowerCase().includes(q) || 
                b.student_email.toLowerCase().includes(q) ||
                (b.exam_name && b.exam_name.toLowerCase().includes(q)) ||
                String(b.id).includes(q)
            );
        }
    },
    watch: {
        searchQuery(newVal) {
            this.fetchBookings(newVal);
        }
    },
    mounted() {
        this.fetchBookings();
    },
    methods: {
        async fetchBookings(query = "") {
            this.loading = true;
            try {
                const url = query ? `/api/admin/bookings?q=${encodeURIComponent(query)}` : "/api/admin/bookings";
                this.bookings = await window.API.get(url);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load bookings";
            } finally {
                this.loading = false;
            }
        },
        async openReschedule(booking) {
            this.selectedBooking = booking;
            this.newSlotId = "";
            this.errorMessage = "";
            this.successMessage = "";
            try {
                // Fetch slots for this booking's exam
                const allSlots = await window.API.get("/api/admin/slots");
                this.availableSlots = allSlots.filter(s => 
                    s.exam_id === booking.exam_id && s.id !== booking.slot_id && s.available_seats > 0
                );
            } catch (err) {
                this.errorMessage = "Failed to load available destination slots";
            }
        },
        async rescheduleBooking() {
            if (!this.newSlotId) return;
            try {
                const res = await window.API.put(`/api/admin/bookings/${this.selectedBooking.id}/reschedule`, {
                    new_slot_id: parseInt(this.newSlotId)
                });
                this.successMessage = res.message || "Candidate rescheduled successfully";
                this.selectedBooking = null;
                this.fetchBookings();
            } catch (err) {
                this.errorMessage = err.message || "Failed to reschedule candidate";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Candidate Bookings</h3>
                <p class="text-muted small">Comprehensive log of student examination reservations & rescheduling</p>
            </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Inline Reschedule Form -->
        <div class="card mb-4 border-danger" v-if="selectedBooking">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <strong>Reschedule Booking #{{ selectedBooking.id }} for {{ selectedBooking.student_name }}</strong>
                <button class="btn btn-sm btn-outline-secondary" @click="selectedBooking = null">Cancel</button>
            </div>
            <div class="card-body">
                <div class="mb-2 small text-muted">
                    Current: <strong>{{ selectedBooking.exam_name }}</strong> &bull; Slot: {{ selectedBooking.slot_date }} ({{ selectedBooking.slot_start }}-{{ selectedBooking.slot_end }}) with {{ selectedBooking.examiner_name }}
                </div>
                <div class="row g-2 align-items-end">
                    <div class="col-md-8">
                        <label class="form-label small">Select Destination Slot (Same Exam)</label>
                        <select class="form-select form-select-sm" v-model="newSlotId">
                            <option value="">Choose an open slot...</option>
                            <option v-for="s in availableSlots" :key="s.id" :value="s.id">
                                Slot #{{ s.id }}: {{ s.date }} {{ s.start_time }}-{{ s.end_time }} (Examiner: {{ s.examiner_name }}) [{{ s.available_seats }} seats left]
                            </option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-sm btn-danger w-100" @click="rescheduleBooking" :disabled="!newSlotId">
                            Confirm Reschedule
                        </button>
                    </div>
                </div>
                <div v-if="availableSlots.length === 0" class="small text-danger mt-2">
                    No alternate slots with open seats are available for this examination.
                </div>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Student</th>
                            <th>Examination</th>
                            <th>Slot Date & Time</th>
                            <th>Examiner</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="7" class="text-center py-4 text-muted">Loading bookings...</td></tr>
                        <tr v-else-if="filteredBookings.length === 0"><td colspan="7" class="text-center py-4 text-muted">No bookings recorded</td></tr>
                        <tr v-for="b in filteredBookings" :key="b.id">
                            <td>#{{ b.id }}</td>
                            <td>
                                <div class="fw-bold">{{ b.student_name }}</div>
                                <div class="small text-muted">{{ b.student_email }}</div>
                            </td>
                            <td>{{ b.exam_name }}</td>
                            <td>{{ b.slot_date }} &bull; {{ b.slot_start }}-{{ b.slot_end }}</td>
                            <td>{{ b.examiner_name }}</td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-primary': b.status === 'Booked',
                                    'bg-secondary': b.status === 'Cancelled',
                                    'bg-success': b.status === 'Completed'
                                }">{{ b.status }}</span>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-danger" @click="openReschedule(b)" v-if="b.status === 'Booked'">
                                    Reschedule
                                </button>
                                <span v-else class="text-muted small">-</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.AdminBookings = AdminBookings;
