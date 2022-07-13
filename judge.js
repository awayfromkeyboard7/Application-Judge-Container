const util = require('util');
const fs = require('fs');
const exec = util.promisify(require('child_process').exec);
const uuid = require('uuid');

const extension = {
  'Python': 'py',
  'JavaScript': 'js',
  'C': 'c',
  'C++': 'cpp',
  'java': 'java'
}

async function createExecFile(userId, problemId, lang, code) {

  const dir = `./code/${problemId}/${userId}`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }

  const filename = uuid.v4();
  fs.writeFileSync(`${dir}/${filename}.${extension[lang]}`, code, function(err) {
    if (err !== null) {
      console.log(`Fail to create file ${err.code}`);
      return false;
    }
  })
  return filename;
}

async function execCode(userId, problemId, lang, filename) {
  console.log(problemId);
  const CMD = `docker run --rm -i \
                -v $(pwd)/code/${problemId}/input:/code/${problemId}/input \
                -v $(pwd)/code/${problemId}/${userId}:/code/${problemId}/${userId} \
                -v $(pwd)/code/${lang}:/code/${lang} \
                -e USER=${userId} -e PROBLEM=${problemId} -e LANGUAGE=${lang} -e SUBMIT=${filename} \
                --security-opt seccomp=$(pwd)/code/profile.json judge:${lang}`
                
  const result = await exec(CMD);
  console.log(result);
  const results = result.stdout.toString().split("{EOF}\n").slice(0, -1);
  return results;
}

async function compareOutput(problemId, userOutput) {
  const outputDir = fs.readdirSync(`./code/${problemId}/output`, 'utf-8');
  const results = [];
  for (let i = 0; i < outputDir.length; i++) {
    results.push(userOutput[i].trim() === fs.readFileSync(`./code/${problemId}/output/${outputDir[i]}`).toString().trim())
  }
  return results;
}

async function deleteFile(filename) {
  await fs.unlink(filename, function(err) {
    if (err !== null) {
      console.log(`Fail to delete file ${err.code}`);
      return false;
    }
  })
  return true;
}

async function judgeCode(userId, problemId, lang, code) {
  const filename = await createExecFile(userId, problemId, lang, code);
  const output = await execCode(userId, problemId, extension[lang], filename);
  const results = await compareOutput(problemId, output);
  // await deleteFile('./code/c1.py');
  // console.log(results);
  // console.log(output);

  let passRates = results.reduce((a, b) => a + b, 0);
  passRates = passRates / results.length * 100

  return {
    results,
    passRate: passRates,
    msg: output
  };
}

module.exports = judgeCode;
