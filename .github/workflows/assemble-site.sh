#!/usr/bin/env bash
# Собирает _site: последний релиз в корне, текущий master в next/, прошлые релизы в v/<версия>/.
# Релизы на React берутся готовыми сборками из GitHub Release, ранние релизы на ванильном JS копируются из тегов.
# Ожидает: зависимости установлены (npm ci), GITHUB_REPOSITORY и GH_TOKEN заданы
set -euo pipefail

repo="${GITHUB_REPOSITORY#*/}"
base="/${repo}/"

# legacy <тег> <папка> — релиз до перехода на React: файлы как есть, без сборки
legacy() {
  local ref="$1" out="$2" src v
  src="$(mktemp -d)"
  git archive "$ref" | tar -x -C "$src"
  mkdir -p "$out"
  if [ -d "$src/frontend" ]; then
    cp -r "$src/frontend/." "$out/"
  else
    (cd "$src" && cp -r index.html demo.html app.js styles.css fonts.css favicon.ico manifest.webmanifest assets "$OLDPWD/$out/")
  fi
  # Версия в адресах стилей и скрипта: браузер не покажет новую разметку со старыми файлами из кеша
  v="$(git rev-parse --short=7 "$ref^{commit}")"
  sed -i -E "s#(styles\.css|fonts\.css)\"#\1?v=$v\"#; s#app\.js\?v=[0-9a-z]+#app.js?v=$v#" "$out/index.html"
  rm -rf "$src"
}

# release <тег> <папка> <архив> — готовая сборка из GitHub Release, а если её нет, ранний релиз из тега
release() {
  local tag="$1" out="$2" asset="$3" tmp
  tmp="$(mktemp -d)"
  if gh release download "$tag" --pattern "$asset" --dir "$tmp" 2>/dev/null; then
    mkdir -p "$out"
    tar -xzf "$tmp/$asset" -C "$out"
    echo "$tag: сборка $asset"
  else
    legacy "$tag" "$out"
    echo "$tag: ранний релиз из тега"
  fi
  rm -rf "$tmp"
}

# about <коммит или тег> <папка канала> — презентация из docs/ того же коммита
about() {
  local src
  src="$(mktemp -d)"
  git archive "$1" docs | tar -x -C "$src"
  mkdir -p "$2/about"
  cp -r "$src/docs/." "$2/about/"
  rm -rf "$src"
}

mapfile -t tags < <(git tag --list 'v*' --sort=-v:refname)
if [ "${#tags[@]}" -eq 0 ]; then
  echo "Нет ни одного тега v*: основному сайту нечего показывать" >&2
  exit 1
fi
latest="${tags[0]}"
echo "Основной сайт: $latest, предпросмотр: $(git rev-parse --short=7 HEAD)"

rm -rf _site
mkdir _site

release "$latest" _site site-root.tar.gz
about "$latest" _site

npm run build --workspace @sielom/web -- --base="${base}next/"
mkdir -p _site/next
cp -r apps/web/dist/. _site/next/
about HEAD _site/next

versions="{\"label\":\"Предпросмотр\",\"note\":\"новее ${latest#v}\",\"path\":\"next/\"},{\"label\":\"${latest#v}\",\"note\":\"актуальная\",\"path\":\"\"}"
for tag in "${tags[@]:1}"; do
  name="${tag#v}"
  release "$tag" "_site/v/$name" site-archive.tar.gz
  about "$tag" "_site/v/$name"
  # В ранних релизах нет списка версий, поэтому оставляем дорогу обратно
  if ! grep -q 'type="module"' "_site/v/$name/index.html"; then
    sed -i "s#</body>#<a href=\"../../\" style=\"position:fixed;z-index:1000;left:50%;bottom:12px;transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:\#ffdf6b;color:\#22221f;font:600 13px system-ui,sans-serif;text-decoration:none;white-space:nowrap\">Версия $name · К актуальной</a></body>#" "_site/v/$name/index.html"
  fi
  versions="$versions,{\"label\":\"$name\",\"note\":\"\",\"path\":\"v/$name/\"}"
done
echo "[$versions]" > _site/versions.json
cat _site/versions.json

sed "s#__BASE__#${base}#g" scripts/pages/404.html > _site/404.html
touch _site/.nojekyll
du -sh _site
