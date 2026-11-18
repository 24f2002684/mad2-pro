// static/js/components/AdminSlots.js
// Admin global examination slots inspection component.

const AdminSlots = {
    props: ["searchQuery"],
    data() {
        return {
            slots: [],
            loading: false,
            errorMessage: ""
        };
    },
    computed: {
        filteredSlots() {
            if (!this.searchQuery) return this.slots;
            const q = this.searchQuery.toLowerCase();
            return this.slots.filter(s => 
                (s.exam_name && s.exam_name.toLowerCase().includes(q)) || 
                (s.examiner_name && s.examiner_name.toLowerCase().includes(q)) ||
                s.date.includes(q)
            );
        }
    },
    mounted() {
        this.fetchSlots();
    },
    methods: {
        async fetchSlots() {
            this.loading = true;
            try {
                this.slots = await window.API.get("/api/admin/slots");
            } catch (err) {
                this.errorMessage = err.message || "Failed to load slots";
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Examination Slots Overview</h3>
                <p class="text-muted small">Global schedule of all slots across faculty examiners</p>
            </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>

        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Slot ID</th>
                            <th>Examination</th>
                            <th>Examiner</th>
                            <th>Date</th>
                            <th>Time Window</th>
                            <th>Capacity</th>
                            <th>Seats Left</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="8" class="text-center py-4 text-muted">Loading slots...</td></tr>
                        <tr v-else-if="filteredSlots.length === 0"><td colspan="8" class="text-center py-4 text-muted">No slots created yet</td></tr>
                        <tr v-for="s in filteredSlots" :key="s.id">
                            <td>#{{ s.id }}</td>
                            <td class="fw-bold">{{ s.exam_name }}</td>
                            <td>{{ s.examiner_name }}</td>
                            <td>{{ s.date }}</td>
                            <td>{{ s.start_time }} - {{ s.end_time }}</td>
                            <td>{{ s.capacity }}</td>
                            <td>
                                <span class="badge" :class="s.available_seats > 0 ? 'bg-primary' : 'bg-secondary'">
                                    {{ s.available_seats }}
                                </span>
                            </td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-success': s.status === 'Available',
                                    'bg-danger': s.status === 'Full',
                                    'bg-secondary': s.status === 'Cancelled',
                                    'bg-info': s.status === 'Completed'
                                }">{{ s.status }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.AdminSlots = AdminSlots;
