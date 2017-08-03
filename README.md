# Timelapse compiler

### What this is

CLI that converts images to a timelapse video.


### Why this is

The reason why I started building this was because I had 22,000 images (from a GoPro) that I wanted convert into a movie. iMovie could not handle that many images. It becomes unusable after a couple of 100 images.
The images were taken over the course of 4 days with an interval of 30 seconds of the harbor while on a trip in Tromsø, Norway.

I searched around for an open source solution in JS but could not find anyone suited for my needs. NodeJS might not be the optimal language for this type of problem, but I wanted to try it out anyways.


### Installation prerequisites

```
brew install ffmpeg --with-fdk-aac --with-ffplay --with-freetype --with-frei0r --with-libass --with-libvo-aacenc --with-libvorbis --with-libvpx --with-opencore-amr --with-openjpeg --with-opus --with-rtmpdump --with-schroedinger --with-speex --with-theora --with-tools --with-x265
```

### Todo:

For now I use this checklist as a todo list. At some point I might convert this to the Github's issue tracker for my own features.
Please add an GitHub issue if you have an idea/bug report.

- [x] Rename files after image resizing to be in continuous sequence
- [x] Add progress bar(s) instead of flooding text updates
  - [x] Progress to gather file info
  - [x] Progress to resizing
  - [x] Progress to renaming
  - [x] Progress to ffmpeg
- [ ] Add more info to README
  - [ ] Animated gif with images -> video
- [ ] Install FFMpeg "properly" with [@ffmpeg-installer/ffmpeg](https://www.npmjs.com/package/@ffmpeg-installer/ffmpeg) ([See step 1 in blog post](http://cliffordhall.com/2016/10/creating-video-server-node-js/))
- [ ] Terminal output "nice and clean"
  - [ ] Output on-start info before progress bars
  - [ ] Improve progress bars info
    -  [ ] Show time elapsed (as well as eta)
    -  [ ] Clear file info on progress complete / Don't show file info at all
- [ ] Add optional clock/time overlay on images
- [ ] Add optional map overlay on images with GPS info
