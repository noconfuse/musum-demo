<template>
  <div class="home" ref="sceneDom"></div>
</template>

<script lang="ts" setup>
import RenderScene3d from "@/utils/threeSence";
import { onMounted, ref } from "vue";

const sceneDom = ref(null);
onMounted(async () => {
  if (!sceneDom.value) {
    return;
  }
  const renderInstance = new RenderScene3d(sceneDom.value as HTMLElement);
  const model = await renderInstance.loadModel({
    basePath: "./",
    modelUrl: "static/city/city_street.glb",
  });
  renderInstance.render(model);
  renderInstance.addMouseEvent();
});
</script>

<style lang="scss" scoped>
.home {
  width: 100%;
  height: 100vh;
}
</style>
