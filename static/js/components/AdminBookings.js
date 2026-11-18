// static/js/components/AdminBookings.js
// Admin global bookings and schedule tracking component.

const AdminBookings = {
    props: ["searchQuery"],
    data() {
        return {
            bookings: [],
            loading: false,
            errorMessage: ""
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
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Candidate Bookings</h3>
                <p class="text-muted small">Comprehensive log of student examination reservations</p>
            </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>

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
                            <th>Booked At</th>
                            <th>Status</th>
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
                            <td class="small text-muted">{{ b.booked_at ? b.booked_at.split('T')[0] : '-' }}</td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-primary': b.status === 'Booked',
                                    'bg-secondary': b.status === 'Cancelled',
                                    'bg-success': b.status === 'Completed'
                                }">{{ b.status }}</span>
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
