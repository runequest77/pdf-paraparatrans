const app = Vue.createApp({
    components: {
        'toggle-switch': {
            props: ["label", "storageKey"],
            data() {
                return {
                    isOn: JSON.parse(localStorage.getItem(this.storageKey)) ?? false
                };
            },
            watch: {
                isOn(newValue) {
                    localStorage.setItem(this.storageKey, JSON.stringify(newValue));
                }
            },
            template: `
                <div class="toggle-container">
                    <label :for="storageKey">{{ label }}</label>
                    <label class="switch">
                        <input type="checkbox" :id="storageKey" v-model="isOn">
                        <span class="slider"></span>
                    </label>
                    <span>{{ isOn ? "ON" : "OFF" }}</span>
                </div>
            `
        }
    }
});

app.mount("#app");
