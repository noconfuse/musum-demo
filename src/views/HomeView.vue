<template>
  <div class="container">
    <div class="home" ref="sceneDom"></div>
    <div class="modal" v-if="modalData.show">
      <p>{{ modalData.text }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import RenderScene3d from "@/utils/threeSence";
import { onMounted, ref, reactive } from "vue";
const modalData = reactive({
  show: false,
  text: "",
  imageUrl: "",
  soundUrl: "",
});

const sceneDom = ref(null);
onMounted(async () => {
  if (!sceneDom.value) {
    return;
  }
  const renderInstance = new RenderScene3d(sceneDom.value as HTMLElement);
  const model = await renderInstance.loadModel({
    basePath: "./",
    modelUrl: "static/city/city_sample_terrain.gltf",
  });
  renderInstance.render(model);
  renderInstance.addEvents();
  // renderInstance.createBoxGeometry((detail) => {
  //   modalData.show = true;
  //   modalData.text = detail.text || "";
  //   modalData.imageUrl = detail.imageUrl || "";
  // });
});
</script>

<style lang="scss" scoped>
.home {
  width: 100%;
  height: 100vh;
}
.modal {
  position: absolute;
  width: 200px;
  height: 100px;
  border-radius: 4px;
  background: rgba($color: #fff, $alpha: 0.8);
  z-index: 100;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
